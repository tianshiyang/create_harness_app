#!/usr/bin/env node
/**
 * Stop hook
 *
 * 职责：
 * - git 有变更时先自动格式化，再运行 type-check / lint / harness:check。
 *   失败时阻断 agent 停止，成功时放行并通知。
 *   注意：不自动暂存（不 git add），由人工决定暂存与提交。
 */

/* eslint-disable @typescript-eslint/no-require-imports */

const { spawnSync } = require('node:child_process')

const dryRun = process.argv.includes('--dry-run') || process.env.HARNESS_QUALITY_DRY_RUN === '1'

function writeJson(value) {
  process.stdout.write(JSON.stringify(value))
}

// 跨平台 shell 参数转义：安全字符直接通过，POSIX 用单引号，Windows 用双引号
function shellQuote(value) {
  const text = String(value)

  if (!/[^\w@%+=:,./-]/.test(text)) {
    return text
  }

  if (process.platform === 'win32') {
    return `"${text.replaceAll('"', '\\"')}"`
  }

  return `'${text.replaceAll("'", "'\\''")}'`
}

// 跨平台执行 shell 命令：Windows 用 cmd.exe，POSIX 用 sh -lc
function runShell(commandLine, timeout = 180000) {
  if (process.platform === 'win32') {
    return spawnSync('cmd.exe', ['/d', '/s', '/c', commandLine], {
      cwd: process.cwd(),
      encoding: 'utf8',
      shell: false,
      timeout,
    })
  }

  return spawnSync('sh', ['-lc', commandLine], {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: false,
    timeout,
  })
}

// 封装命令执行，支持 --dry-run 模式跳过实际执行
function run(command, args) {
  if (dryRun) {
    return {
      command: [command, ...args].join(' '),
      status: 0,
      stdout: '[dry-run] skipped command execution',
      stderr: '',
      error: '',
    }
  }

  const commandLine = [command, ...args].map(shellQuote).join(' ')
  const result = runShell(commandLine)

  return {
    command: [command, ...args].join(' '),
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? result.error.message : '',
  }
}

// 获取 git 变更文件列表（porcelain 格式）
function gitStatus() {
  const result = runShell('git status --porcelain --untracked-files=all', 15000)

  if (result.status !== 0) {
    return null
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

// Stop 模式：无变更时跳过门禁，否则运行完整的质量检查流水线
const changed = gitStatus()

if (changed && changed.length === 0) {
  writeJson({
    continue: true,
    systemMessage: 'Harness 质量门禁跳过：git 未检测到变更文件。',
  })
  process.exit(0)
}

// Stop 收尾阶段允许自动格式化（本项目唯一允许自动格式化的 hook）
const formatResult = run('pnpm', ['format'])
const commands = [
  ['pnpm', ['type-check']],
  ['pnpm', ['lint']],
  ['pnpm', ['harness:check']],
]

const results = [formatResult, ...commands.map(([command, args]) => run(command, args))]
const failed = results.filter((result) => result.status !== 0)

if (failed.length > 0) {
  const details = failed
    .map((result) => {
      const output = `${result.stdout}\n${result.stderr}\n${result.error}`.trim()
      return `命令失败：${result.command}\n${output.slice(-2400)}`
    })
    .join('\n\n')

  writeJson({
    continue: false,
    stopReason: `Harness 质量门禁未通过。请修复以下问题后再继续。\n\n${details}`,
  })
  process.exit(0)
}

writeJson({
  continue: true,
  systemMessage: `Harness 质量门禁通过。变更文件数：${
    changed ? changed.length : 0
  }。已通过的检查：pnpm format（自动修复）、pnpm type-check、pnpm lint、pnpm harness:check。`,
})
