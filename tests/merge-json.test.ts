/**
 * merge-json 单元测试
 *
 * mergePackageJson 负责把「我们要叠加的包/脚本」安全地合并进 create-vue 已生成的 package.json。
 * 核心规则：
 *   - 依赖（dependencies / devDependencies）：只补充没有的包，已有的包不覆盖（避免降版本）
 *   - 脚本（scripts）：我们的脚本总是覆盖 create-vue 同名脚本（如 check、harness:sync）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergePackageJson } from '../src/merge-json.ts'

test('新依赖被正确添加', () => {
  // 场景：create-vue 已装了 vue，我们要叠加 axios
  const result = mergePackageJson(
    { dependencies: { vue: '^3.5.0' } },
    { dependencies: { axios: '^1.16.0' } }
  )
  // axios 被加进来，vue 原封不动
  assert.equal((result.dependencies as Record<string, string>).axios, '^1.16.0')
  assert.equal((result.dependencies as Record<string, string>).vue, '^3.5.0')
})

test('不降级已有依赖版本', () => {
  // 场景：create-vue 里已有 axios ^2.0.0，我们模板里写的是 ^1.16.0
  // 期望：保留用户的高版本，不把它降回来
  const result = mergePackageJson(
    { dependencies: { axios: '^2.0.0' } },
    { dependencies: { axios: '^1.16.0' } }
  )
  assert.equal((result.dependencies as Record<string, string>).axios, '^2.0.0')
})

test('我们的脚本覆盖 create-vue 默认脚本', () => {
  // 场景：create-vue 生成了 dev/check 脚本，我们要用自己的 check 和 harness:sync 替换
  // check 被我们的版本覆盖；dev 是 create-vue 专属的，保持不变；harness:sync 是新增的
  const result = mergePackageJson(
    { scripts: { dev: 'vite', check: 'echo old' } },
    { scripts: { check: 'pnpm type-check', 'harness:sync': 'node scripts/x' } }
  )
  assert.equal((result.scripts as Record<string, string>).check, 'pnpm type-check', 'check 应被我们的版本覆盖')
  assert.equal((result.scripts as Record<string, string>).dev, 'vite', 'create-vue 的 dev 脚本不应丢失')
  assert.equal((result.scripts as Record<string, string>)['harness:sync'], 'node scripts/x', 'harness:sync 应被新增')
})

test('保留 package.json 顶层字段（name、version 等）', () => {
  // 场景：合并时不能把 name/version 这些字段洗掉
  const result = mergePackageJson(
    { name: 'my-app', version: '0.1.0', dependencies: {} },
    { dependencies: {} }
  )
  assert.equal(result.name as string, 'my-app')
})

test('原本没有 devDependencies 时自动创建并填充', () => {
  // 场景：create-vue 极简模式可能没有 devDependencies，我们要正常加进去
  const result = mergePackageJson({}, { devDependencies: { typescript: '~5.7.0' } })
  assert.equal((result.devDependencies as Record<string, string>).typescript, '~5.7.0')
})
