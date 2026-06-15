#!/usr/bin/env node
/**
 * SubagentStop / Notification hook
 *
 * 职责：
 * - SubagentStop 模式：解析审查结果，FAIL 时阻断主 agent，PASS 时通知。
 * - Notification 模式：将通用消息转发为系统通知。
 * 跨平台支持：macOS osascript → Windows pwsh → powershell → stderr 降级。
 */

/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('node:fs')
const { spawnSync } = require('node:child_process')

const mode = process.argv[2] || 'notification'

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

// PowerShell 字符串中的单引号转义（单引号内用 '' 表示一个单引号）
function escapePowerShell(value) {
  return String(value).replaceAll("'", "''")
}

// 发送跨平台系统通知，带三级降级：macOS osascript → Windows pwsh/powershell → stderr
function notify(title, message) {
  const cleanTitle = String(title).slice(0, 80)
  const cleanMessage = String(message).replace(/\s+/g, ' ').trim().slice(0, 220)

  if (process.argv.includes('--dry-run') || process.env.HARNESS_NOTIFY_DRY_RUN === '1') {
    process.stderr.write(`[dry-run notification] ${cleanTitle}: ${cleanMessage}\n`)
    return
  }

  if (process.platform === 'darwin') {
    const script = `display notification ${JSON.stringify(cleanMessage)} with title ${JSON.stringify(cleanTitle)}`
    const result = spawnSync('osascript', ['-e', script], { stdio: 'ignore', timeout: 10000 })

    if (!result.error && result.status === 0) {
      return
    }
  }

  if (process.platform === 'win32') {
    const script = [
      "$ErrorActionPreference = 'Stop'",
      'Add-Type -AssemblyName System.Windows.Forms',
      '$notify = New-Object System.Windows.Forms.NotifyIcon',
      '$notify.Icon = [System.Drawing.SystemIcons]::Information',
      '$notify.Visible = $true',
      `$notify.ShowBalloonTip(5000, '${escapePowerShell(cleanTitle)}', '${escapePowerShell(cleanMessage)}', 'Info')`,
      'Start-Sleep -Seconds 6',
      '$notify.Dispose()',
    ].join('; ')

    const pwshResult = spawnSync(
      'pwsh.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { stdio: 'ignore', timeout: 15000 },
    )

    if (!pwshResult.error && pwshResult.status === 0) {
      return
    }

    const result = spawnSync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { stdio: 'ignore', timeout: 15000 },
    )

    if (!result.error && result.status === 0) {
      return
    }
  }

  process.stderr.write(`[${cleanTitle}] ${cleanMessage}\n`)
}

// 从不同 hook payload 格式中提取消息文本（兼容多种 payload 结构）
function extractMessage(payload) {
  return (
    payload.message ||
    payload.notification_message ||
    payload.last_assistant_message ||
    payload.transcript_tail ||
    ''
  )
}

const payload = readJsonStdin()
const message = extractMessage(payload)

// SubagentStop 模式：解析审查结果，FAIL 时阻断主 agent 继续执行
if (mode === 'subagent-stop') {
  const text = String(message)

  // 从后往前找最后一个配对的 {...}，避免贪婪正则匹配到解释性文本中的大括号
  let jsonResult = null
  let lastBrace = -1
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === '}') {
      lastBrace = i
      break
    }
  }
  if (lastBrace >= 0) {
    let depth = 1
    let openBrace = -1
    for (let i = lastBrace - 1; i >= 0; i--) {
      if (text[i] === '}') depth++
      else if (text[i] === '{') depth--
      if (depth === 0) {
        openBrace = i
        break
      }
    }
    if (openBrace >= 0) {
      try {
        jsonResult = JSON.parse(text.slice(openBrace, lastBrace + 1))
      } catch {
        // JSON 解析失败，继续使用字符串 fallback
      }
    }
  }

  // JSON 有效时以 ok 字段为准；无效时 fallback 到尾部字符串匹配
  const isFail =
    (jsonResult && jsonResult.ok === false) ||
    (!jsonResult && text.trimEnd().endsWith('HARNESS_REVIEW_RESULT: FAIL'))

  const isPass =
    (jsonResult && jsonResult.ok === true) ||
    (!jsonResult && text.trimEnd().endsWith('HARNESS_REVIEW_RESULT: PASS'))

  if (isFail) {
    notify('Claude Code 代码审查', '审查未通过，请继续修复报告的问题。')
    process.stdout.write(
      JSON.stringify({
        continue: false,
        stopReason: 'AI 代码审查未通过。请根据审查报告修复问题后再次尝试完成。',
      }),
    )
    process.exit(0)
  }

  if (isPass) {
    notify('Claude Code', '任务已完成，代码审查通过。')
  }

  process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }))
  process.exit(0)
}

// Notification 模式：通用通知转发
notify('Claude Code', message || 'Claude Code 需要您的关注。')
process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }))
