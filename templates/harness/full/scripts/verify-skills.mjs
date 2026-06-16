#!/usr/bin/env node
/**
 * 校验 skills 体系的一致性
 *
 * 检查项：
 * 1. .claude/skills 下每个 skill 都有 SKILL.md 入口
 * 2. skills-lock.json 的条目与 .claude/skills 目录完全一致
 * 3. skills-lock.json 的 computedHash 与实际目录内容一致
 *
 * --write 模式：更新 skills-lock.json（用于发布 skill 变更时）
 */

import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { lstat, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const skillsDir = path.join(root, '.claude', 'skills')
const lockPath = path.join(root, 'skills-lock.json')
const writeMode = process.argv.includes('--write')

const defaultSources = {
  'find-skills': {
    source: 'anthropics/skills',
    sourceType: 'github',
  },
  'vue-best-practices': {
    source: 'moeru-ai/airi',
    sourceType: 'github',
  },
}

// 路径分隔符转 POSIX 格式（跨平台一致性）
function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/')
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'))
}

// 递归收集目录下所有文件，跳过 .DS_Store，禁止符号链接（skill 路径必须是真实文件）
async function collectFiles(dir, baseDir = dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.name === '.DS_Store') {
      continue
    }

    const fullPath = path.join(dir, entry.name)
    const stat = await lstat(fullPath)

    if (stat.isSymbolicLink()) {
      throw new Error(`Skill paths must be real project files, not links: ${fullPath}`)
    }

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath, baseDir)))
    } else if (entry.isFile()) {
      files.push({
        fullPath,
        relativePath: toPosix(path.relative(baseDir, fullPath)),
      })
    }
  }

  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
}

// 计算目录内容确定性 hash：按相对路径排序，拼接路径+内容+分隔符后 SHA-256
async function hashDirectory(dir) {
  const hash = createHash('sha256')
  const files = await collectFiles(dir)

  for (const file of files) {
    hash.update(file.relativePath)
    hash.update('\0')
    hash.update(await readFile(file.fullPath))
    hash.update('\0')
  }

  return hash.digest('hex')
}

async function listSkillNames(dir) {
  if (!existsSync(dir)) {
    return []
  }

  const entries = await readdir(dir, { withFileTypes: true })

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

// 断言两个 skill 名称集合完全一致（用于 .claude/skills 与 .agents/skills 镜像校验）
function assertEqualSets(label, actual, expected) {
  const actualList = [...actual].sort()
  const expectedList = [...expected].sort()

  if (actualList.join('\n') !== expectedList.join('\n')) {
    throw new Error(
      `${label} mismatch.\nActual: ${actualList.join(', ') || '(none)'}\nExpected: ${
        expectedList.join(', ') || '(none)'
      }`,
    )
  }
}

async function main() {
  if (!existsSync(skillsDir)) {
    throw new Error(`Missing skills directory: ${skillsDir}`)
  }

  const skillNames = await listSkillNames(skillsDir)

  const hashes = {}

  for (const skillName of skillNames) {
    hashes[skillName] = await hashDirectory(path.join(skillsDir, skillName))
  }

  const existingLock = existsSync(lockPath) ? await readJson(lockPath) : { version: 1, skills: {} }
  const nextLock = {
    version: 1,
    skills: Object.fromEntries(
      skillNames.map((skillName) => {
        const existing = existingLock.skills?.[skillName] || {}
        const source = existing.source || defaultSources[skillName]?.source || 'project-local'
        const sourceType = existing.sourceType || defaultSources[skillName]?.sourceType || 'local'

        return [
          skillName,
          {
            source,
            sourceType,
            computedHash: hashes[skillName],
          },
        ]
      }),
    ),
  }

  if (writeMode) {
    await writeFile(lockPath, `${JSON.stringify(nextLock, null, 2)}\n`)
    process.stdout.write(`Updated skills-lock.json for ${skillNames.length} skill(s).\n`)
    return
  }

  const lock = existingLock
  const lockNames = new Set(Object.keys(lock.skills || {}))
  const skillNameSet = new Set(skillNames)
  assertEqualSets('skills-lock.json entries', lockNames, skillNameSet)

  // 校验每个 skill 的入口文件和 lock hash
  for (const skillName of skillNames) {
    const sourceSkillMd = path.join(skillsDir, skillName, 'SKILL.md')

    if (!existsSync(sourceSkillMd)) {
      throw new Error(`Missing skill entrypoint: ${sourceSkillMd}`)
    }

    const lockedHash = lock.skills?.[skillName]?.computedHash

    if (lockedHash !== hashes[skillName]) {
      throw new Error(
        `Hash mismatch for ${skillName}.\nExpected lock: ${hashes[skillName]}\nActual lock: ${lockedHash}`,
      )
    }
  }

  process.stdout.write(
    `Harness skill check passed for ${skillNames.length} skill(s).\n`,
  )
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`)
  process.exit(1)
})
