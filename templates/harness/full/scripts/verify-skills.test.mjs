#!/usr/bin/env node
/**
 * verify-skills.mjs 的最小集成测试
 *
 * 覆盖：
 * 1. --write 能生成 lock
 * 2. .agents/skills 镜像内容漂移时会失败
 */

import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const verifyScript = path.join(repoRoot, 'scripts', 'verify-skills.mjs')

async function writeFixtureFile(root, relativePath, content) {
  const fullPath = path.join(root, relativePath)
  await mkdir(path.dirname(fullPath), { recursive: true })
  await writeFile(fullPath, content)
}

function runVerify(root, args = []) {
  return spawnSync(process.execPath, [verifyScript, ...args], {
    cwd: root,
    encoding: 'utf8',
  })
}

async function withSkillFixture(testFn) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'verify-skills-'))

  try {
    const skill = `---
name: sample-skill
description: Sample skill for harness tests.
---

# Sample Skill
`

    await writeFixtureFile(root, '.claude/skills/sample-skill/SKILL.md', skill)
    await writeFixtureFile(root, '.agents/skills/sample-skill/SKILL.md', skill)

    await testFn(root)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

await withSkillFixture(async (root) => {
  const writeResult = runVerify(root, ['--write'])
  assert.equal(writeResult.status, 0, writeResult.stderr)

  const checkResult = runVerify(root)
  assert.equal(checkResult.status, 0, checkResult.stderr)
  assert.match(checkResult.stdout, /Harness skill check passed/)
})

await withSkillFixture(async (root) => {
  assert.equal(runVerify(root, ['--write']).status, 0)
  await writeFixtureFile(root, '.agents/skills/sample-skill/SKILL.md', '# Drifted Skill\n')

  const result = runVerify(root)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Mirrored SKILL\.md is out of sync/)
})

console.log('verify-skills tests passed')
