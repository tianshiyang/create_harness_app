#!/usr/bin/env node
/**
 * harness hooks 的最小行为测试
 *
 * 覆盖：
 * 1. guard-tool 阻断敏感路径
 * 2. guard-tool 阻断危险命令
 * 3. guard-tool 放行普通命令
 * 4. quality-gate 在 dry-run Stop 模式可完成质量门禁流程
 */

import assert from 'node:assert/strict'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const guardTool = path.join(repoRoot, '.claude', 'hooks', 'guard-tool.cjs')
const qualityGate = path.join(repoRoot, '.claude', 'hooks', 'quality-gate.cjs')
const notifyHook = path.join(repoRoot, '.claude', 'hooks', 'notify.cjs')

function runHook(script, args, payload) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    input: JSON.stringify(payload),
    encoding: 'utf8',
  })
}

function parseStdout(result) {
  assert.equal(result.status, 0, result.stderr)
  return JSON.parse(result.stdout)
}

const sensitiveRead = parseStdout(
  runHook(guardTool, [], {
    tool_name: 'Read',
    tool_input: { file_path: '.env.production' },
  }),
)
assert.equal(sensitiveRead.continue, false)
assert.equal(sensitiveRead.permissionDecision, 'deny')

const sensitiveShellRedirect = parseStdout(
  runHook(guardTool, [], {
    tool_name: 'Bash',
    tool_input: { command: 'cat<.env.production' },
  }),
)
assert.equal(sensitiveShellRedirect.continue, false)
assert.match(sensitiveShellRedirect.stopReason, /sensitive path/)

const sensitiveInlineScript = parseStdout(
  runHook(guardTool, [], {
    tool_name: 'Bash',
    tool_input: { command: `node -e "require('fs').readFileSync('.env.production','utf8')"` },
  }),
)
assert.equal(sensitiveInlineScript.continue, false)
assert.match(sensitiveInlineScript.stopReason, /sensitive path/)

const destructiveCommand = parseStdout(
  runHook(guardTool, [], {
    tool_name: 'Bash',
    tool_input: { command: 'git status && rm -rf dist' },
  }),
)
assert.equal(destructiveCommand.continue, false)
assert.match(destructiveCommand.stopReason, /recursive force delete/)

const recursiveForceSwapped = parseStdout(
  runHook(guardTool, [], {
    tool_name: 'Bash',
    tool_input: { command: 'rm -fr dist' },
  }),
)
assert.equal(recursiveForceSwapped.continue, false)
assert.match(recursiveForceSwapped.stopReason, /recursive force delete/)

const recursiveForceSplit = parseStdout(
  runHook(guardTool, [], {
    tool_name: 'Bash',
    tool_input: { command: 'rm -r -f dist' },
  }),
)
assert.equal(recursiveForceSplit.continue, false)
assert.match(recursiveForceSplit.stopReason, /recursive force delete/)

const safeCommand = parseStdout(
  runHook(guardTool, [], {
    tool_name: 'Bash',
    tool_input: { command: 'git status --short' },
  }),
)
assert.equal(safeCommand.continue, true)

const envVarBypass = parseStdout(
  runHook(guardTool, [], {
    tool_name: 'Bash',
    tool_input: { command: 'GIT_DIR=.git git reset --hard' },
  }),
)
assert.equal(envVarBypass.continue, false)
assert.match(envVarBypass.stopReason, /destructive git reset/)

const gitClean = parseStdout(
  runHook(guardTool, [], {
    tool_name: 'Bash',
    tool_input: { command: 'git clean -fd' },
  }),
)
assert.equal(gitClean.continue, false)
assert.match(gitClean.stopReason, /destructive git clean/)

const gitCleanSwapped = parseStdout(
  runHook(guardTool, [], {
    tool_name: 'Bash',
    tool_input: { command: 'git clean -df' },
  }),
)
assert.equal(gitCleanSwapped.continue, false)
assert.match(gitCleanSwapped.stopReason, /destructive git clean/)

const gitCheckoutPath = parseStdout(
  runHook(guardTool, [], {
    tool_name: 'Bash',
    tool_input: { command: 'git checkout -- src/App.vue' },
  }),
)
assert.equal(gitCheckoutPath.continue, false)
assert.match(gitCheckoutPath.stopReason, /destructive git checkout/)

const gitRestorePath = parseStdout(
  runHook(guardTool, [], {
    tool_name: 'Bash',
    tool_input: { command: 'git restore src/App.vue' },
  }),
)
assert.equal(gitRestorePath.continue, false)
assert.match(gitRestorePath.stopReason, /destructive git restore/)

const forceRefSpec = parseStdout(
  runHook(guardTool, [], {
    tool_name: 'Bash',
    tool_input: { command: 'git push origin +main' },
  }),
)
assert.equal(forceRefSpec.continue, false)
assert.match(forceRefSpec.stopReason, /force push via refspec/)

const stopDryRun = parseStdout(runHook(qualityGate, ['stop', '--dry-run'], {}))
assert.equal(stopDryRun.continue, true)
assert.match(stopDryRun.systemMessage, /Harness 质量门禁(通过|跳过)/)

// --- notify.cjs SubagentStop 测试 ---

// JSON 契约 ok=false 应阻断
const subagentJsonFail = parseStdout(
  runHook(notifyHook, ['subagent-stop', '--dry-run'], {
    last_assistant_message: 'Review done. {"ok": false, "reason": "test failure"}',
  }),
)
assert.equal(subagentJsonFail.continue, false)
assert.match(subagentJsonFail.stopReason, /审查未通过/)

// JSON 契约 ok=true 应放行
const subagentJsonPass = parseStdout(
  runHook(notifyHook, ['subagent-stop', '--dry-run'], {
    last_assistant_message: 'Review done. {"ok": true}',
  }),
)
assert.equal(subagentJsonPass.continue, true)

// 纯字符串 FAIL 标记（在末尾）应阻断
const subagentStringFail = parseStdout(
  runHook(notifyHook, ['subagent-stop', '--dry-run'], {
    message: 'Some review output\nHARNESS_REVIEW_RESULT: FAIL',
  }),
)
assert.equal(subagentStringFail.continue, false)
assert.match(subagentStringFail.stopReason, /审查未通过/)

// 纯字符串 PASS 标记（在末尾）应放行
const subagentStringPass = parseStdout(
  runHook(notifyHook, ['subagent-stop', '--dry-run'], {
    message: 'Some review output\nHARNESS_REVIEW_RESULT: PASS',
  }),
)
assert.equal(subagentStringPass.continue, true)

// 边界：解释性文本含 FAIL 但 JSON ok=true，应放行（核心 bug 修复验证）
const subagentExplainFail = parseStdout(
  runHook(notifyHook, ['subagent-stop', '--dry-run'], {
    message:
      'Code review passed. Note: HARNESS_REVIEW_RESULT: FAIL would mean issues. {"ok": true, "reason": "All checks passed."}',
  }),
)
assert.equal(subagentExplainFail.continue, true)

// 边界：JSON 前有代码块含 {}，应正确解析最后一个 JSON
const subagentCodeBlock = parseStdout(
  runHook(notifyHook, ['subagent-stop', '--dry-run'], {
    message: 'Config: {"name": "test"}. Result: {"ok": false, "reason": "missing type"}',
  }),
)
assert.equal(subagentCodeBlock.continue, false)
assert.match(subagentCodeBlock.stopReason, /审查未通过/)

// 边界：中间含 FAIL 但末尾是 PASS（字符串 fallback），应放行
const subagentMiddleFail = parseStdout(
  runHook(notifyHook, ['subagent-stop', '--dry-run'], {
    message:
      'I checked the code. HARNESS_REVIEW_RESULT: FAIL would be bad.\nHARNESS_REVIEW_RESULT: PASS',
  }),
)
assert.equal(subagentMiddleFail.continue, true)

console.log('harness hook tests passed')
