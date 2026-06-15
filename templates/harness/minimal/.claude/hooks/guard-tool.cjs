#!/usr/bin/env node
/**
 * PreToolUse 安全守护 hook
 *
 * 职责：在 Claude Code 执行任何工具之前拦截，阻断危险命令和敏感文件访问。
 * 覆盖 Bash/Read/Write/Edit/Grep/Agent 等工具调用。
 * 不改写任何文件，只返回 continue/deny 决策。
 */

/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('node:fs')
const path = require('node:path')

// 从 stdin 读取 Claude Code 传入的 JSON hook payload
function readJsonStdin() {
  const input = fs.readFileSync(0, 'utf8').trim()
  if (!input) {
    return {}
  }

  try {
    return JSON.parse(input)
  } catch {
    return {}
  }
}

// 构造拦截响应：阻止执行并附带原因
function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      continue: false,
      stopReason: reason,
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    }),
  )
}

// 构造放行响应：允许执行，抑制输出
function allow() {
  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }))
}

// 统一路径格式：Windows 反斜线 → 正斜线，去除两端引号
function normalizePath(value) {
  return String(value ?? '')
    .replaceAll('\\', '/')
    .replace(/^["']|["']$/g, '')
}

// 从嵌套的 toolInput 对象中递归收集所有含路径含义的字符串值
function collectPaths(value, results = []) {
  if (!value) {
    return results
  }

  if (typeof value === 'string') {
    results.push(value)
    return results
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectPaths(item, results)
    }
    return results
  }

  if (typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (/path|file|filename/i.test(key) && typeof item === 'string') {
        results.push(item)
      } else {
        collectPaths(item, results)
      }
    }
  }

  return results
}

// 判断文件路径是否为密钥/凭证等敏感文件（允许 .env.example）
function isSensitivePath(filePath) {
  const normalized = normalizePath(filePath)
  const base = path.posix.basename(normalized)

  if (!normalized) {
    return false
  }

  if (base === '.env.example') {
    return false
  }

  return (
    /^\.env($|\.)/.test(base) ||
    /(^|\/)\.env($|\.)/.test(normalized) ||
    /(^|\/)secrets?\//i.test(normalized) ||
    /(^|\/)(id_rsa|id_ed25519|known_hosts)$/i.test(normalized) ||
    /\.(pem|key|p12|pfx|crt|cer)$/i.test(base)
  )
}

// 判断 glob pattern 是否匹配敏感文件模式
function isSensitiveGlob(glob) {
  const normalized = String(glob ?? '').replaceAll('\\', '/')
  return (
    /^\.env($|\*)/.test(normalized) ||
    /(^|\/)\.env($|\*)/.test(normalized) ||
    /(^|\/)secrets?\//i.test(normalized) ||
    /\.(pem|key|p12|pfx|crt|cer)$/i.test(normalized)
  )
}

// 从 shell 命令文本中提取可能的路径片段。不能只按空白切分：
// cat<.env.production、node -e "readFileSync('.env')" 这类写法都不会产生独立空白 token。
function collectCommandPathCandidates(command) {
  return String(command ?? '')
    .replaceAll('\\', '/')
    .split(/[\s"'`$;&|()<>,={}[\]]+/)
    .map((token) => token.trim())
    .filter(Boolean)
}

// 检测 Bash 命令是否包含危险操作（破坏性 Git、递归删除、低级磁盘写入等）
// commandStart 匹配命令起始位置：行首、管道/分号后，或环境变量赋值后
function dangerousCommandReason(command) {
  const commandStart = String.raw`(?:^|[;&|()])\s*(?:\w+=(?:"[^"]*"|'[^']*'|[^\s;|()]+)\s+)*`
  const checks = [
    [new RegExp(`${commandStart}git\\s+reset\\s+--hard\\b`, 'i'), 'Blocked destructive git reset.'],
    [
      new RegExp(`${commandStart}git\\s+reset\\s+--mixed\\s+HEAD\\b`, 'i'),
      'Blocked destructive git reset.',
    ],
    [
      new RegExp(`${commandStart}git\\s+push\\s+--force(?:-with-lease)?\\b`, 'i'),
      'Blocked force push.',
    ],
    [
      new RegExp(`${commandStart}git\\s+push\\s+\\S+\\s+--delete\\b`, 'i'),
      'Blocked remote branch deletion.',
    ],
    [
      new RegExp(`${commandStart}git\\s+push\\s+\\S+\\s+\\+\\S+\\b`, 'i'),
      'Blocked force push via refspec.',
    ],
    [new RegExp(`${commandStart}git\\s+branch\\s+-D\\b`, 'i'), 'Blocked local branch deletion.'],
    [new RegExp(`${commandStart}git\\s+stash\\s+(drop|clear)\\b`, 'i'), 'Blocked stash deletion.'],
    [
      new RegExp(`${commandStart}git\\s+checkout\\s+(?:--\\s+|\\.)`, 'i'),
      'Blocked destructive git checkout.',
    ],
    [new RegExp(`${commandStart}git\\s+restore\\b`, 'i'), 'Blocked destructive git restore.'],
    [
      new RegExp(
        `${commandStart}git\\s+clean\\s+(?=[^;&|\\n]*-[A-Za-z]*f)(?=[^;&|\\n]*-[A-Za-z]*d)`,
        'i',
      ),
      'Blocked destructive git clean.',
    ],
    [
      new RegExp(`${commandStart}rm\\s+(?=[^;&|\\n]*-[A-Za-z]*r)(?=[^;&|\\n]*-[A-Za-z]*f)`, 'i'),
      'Blocked recursive force delete.',
    ],
    [new RegExp(`${commandStart}del\\s+\\/[fsq]\\b`, 'i'), 'Blocked destructive Windows delete.'],
    [new RegExp(`${commandStart}rmdir\\s+\\/s\\b`, 'i'), 'Blocked recursive directory delete.'],
    [
      new RegExp(`${commandStart}Remove-Item\\b.*\\s-Recurse\\b.*\\s-Force\\b`, 'i'),
      'Blocked recursive force delete.',
    ],
    [new RegExp(`${commandStart}dd\\s+\\b`, 'i'), 'Blocked low-level disk write command.'],
  ]

  for (const [pattern, reason] of checks) {
    if (pattern.test(command)) {
      return reason
    }
  }

  return ''
}

// === 主逻辑 ===

// 1. Bash 命令检查：先检测危险命令，再扫描命令中的敏感路径
const payload = readJsonStdin()
const toolName = payload.tool_name || payload.toolName || payload.tool || ''
const toolInput = payload.tool_input || payload.toolInput || {}
const command = String(toolInput.command || '')

if (/bash/i.test(toolName) && command) {
  const reason = dangerousCommandReason(command)

  if (reason) {
    deny(`${reason} Command: ${command.slice(0, 160)}`)
    process.exit(0)
  }

  for (const token of collectCommandPathCandidates(command)) {
    if (isSensitivePath(token)) {
      deny(`Blocked command touching sensitive path: ${token}`)
      process.exit(0)
    }
  }
}

// 2. 工具输入路径检查：递归收集所有路径参数，检测敏感文件
const paths = collectPaths(toolInput).map(normalizePath)
const sensitive = paths.find(isSensitivePath)

if (sensitive) {
  deny(`Blocked access to sensitive path: ${sensitive}`)
  process.exit(0)
}

// 3. Grep 工具专项检查：glob pattern 和搜索路径中的敏感文件
if (/grep/i.test(toolName)) {
  const glob = String(toolInput.glob || '')
  const grepPath = String(toolInput.path || '')

  if (glob && isSensitiveGlob(glob)) {
    deny(`Blocked Grep with sensitive glob pattern: ${glob}`)
    process.exit(0)
  }

  if (grepPath && isSensitivePath(grepPath)) {
    deny(`Blocked Grep in sensitive path: ${grepPath}`)
    process.exit(0)
  }
}

allow()
