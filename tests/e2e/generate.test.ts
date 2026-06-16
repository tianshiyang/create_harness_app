/**
 * E2E 生成测试
 *
 * 真实调用 CLI（node dist/index.mjs），在临时目录里生成完整项目，
 * 然后断言关键文件存在、内容正确。
 *
 * 每个测试都依赖 create-vue 网络下载（npx create-vue@latest），耗时较长，timeout 设为 3 分钟。
 * 运行前需先执行 pnpm build 生成 dist/index.mjs。
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import os from 'node:os'
import fse from 'fs-extra'
import { execa } from 'execa'

const TMP = path.join(os.tmpdir(), `harness-e2e-${Date.now()}`)
const BIN = path.resolve('dist/index.mjs')

before(async () => { await fse.ensureDir(TMP) })
after(async ()  => { await fse.remove(TMP) })

test('--yes 默认模式：生成包含 axios + Element Plus + Harness Full 的完整项目', { timeout: 180_000 }, async () => {
  // --yes 等同于：TS + Router + Pinia + Element Plus + axios + harness:full，全部用默认值，不弹交互提示
  await execa('node', [BIN, 'test-app', '--yes'], { cwd: TMP, stdio: 'pipe' })
  const root = path.join(TMP, 'test-app')

  // create-vue 基础骨架必须存在
  assert.ok(await fse.pathExists(path.join(root, 'src/main.ts')), 'main.ts 不存在')
  assert.ok(await fse.pathExists(path.join(root, 'vite.config.ts')), 'vite.config.ts 不存在')

  // axios 请求层：request.ts（封装 axios 实例）、show-error.ts（错误弹窗）、api.ts（通用类型）
  assert.ok(await fse.pathExists(path.join(root, 'src/api/request.ts')), 'axios 请求层 request.ts 不存在')
  assert.ok(await fse.pathExists(path.join(root, 'src/utils/show-error.ts')), 'show-error.ts 不存在')
  assert.ok(await fse.pathExists(path.join(root, 'src/types/api.ts')), 'API 类型文件 api.ts 不存在')

  // Element Plus 模式下，show-error.ts 应使用 ElMessage.error 而不是 console.error
  const showErr = await fse.readFile(path.join(root, 'src/utils/show-error.ts'), 'utf-8')
  assert.ok(showErr.includes('ElMessage'), 'Element Plus 模式的 show-error 应调用 ElMessage.error')

  // main.ts 必须被注入 Element Plus 的 import 和 app.use(ElementPlus)
  const main = await fse.readFile(path.join(root, 'src/main.ts'), 'utf-8')
  assert.ok(main.includes('element-plus'), 'main.ts 未注入 element-plus import')
  assert.ok(main.includes('app.use(ElementPlus)'), 'main.ts 未注入 app.use(ElementPlus)')

  // vite.config.ts 必须被注入按需导入解析器
  const vite = await fse.readFile(path.join(root, 'vite.config.ts'), 'utf-8')
  assert.ok(vite.includes('ElementPlusResolver'), 'vite.config.ts 未注入 ElementPlusResolver')

  // package.json 必须包含 element-plus、axios 依赖，以及 harness:sync 脚本
  const pkg = await fse.readJson(path.join(root, 'package.json'))
  assert.ok(pkg.dependencies?.['element-plus'], 'package.json 缺少 element-plus 依赖')
  assert.ok(pkg.dependencies?.['axios'], 'package.json 缺少 axios 依赖')
  assert.ok(pkg.scripts?.['harness:sync'], 'package.json 缺少 harness:sync 脚本')

  // Harness Full 必须包含安全 hook 和 CLAUDE.md
  assert.ok(await fse.pathExists(path.join(root, '.claude/hooks/guard-tool.cjs')), 'guard-tool.cjs 不存在')
  assert.ok(await fse.pathExists(path.join(root, '.claude/hooks/quality-gate.cjs')), 'quality-gate.cjs 不存在')
  assert.ok(await fse.pathExists(path.join(root, 'CLAUDE.md')), 'CLAUDE.md 不存在')
})

test('--harness=none：跳过 Harness，不生成 .claude/ 和 CLAUDE.md', { timeout: 180_000 }, async () => {
  // 用户选择不集成 Harness 治理层时，.claude/ 目录和 CLAUDE.md 都不应该出现
  await execa('node', [BIN, 'test-no-harness', '--yes', '--harness=none'], { cwd: TMP, stdio: 'pipe' })
  const root = path.join(TMP, 'test-no-harness')
  assert.equal(await fse.pathExists(path.join(root, '.claude/hooks/guard-tool.cjs')), false, 'guard-tool.cjs 不应存在')
  assert.equal(await fse.pathExists(path.join(root, 'CLAUDE.md')), false, 'CLAUDE.md 不应存在')
})

test('--ui=none：不集成 UI 库时，show-error 使用 console.error', { timeout: 180_000 }, async () => {
  // 没有 UI 库就无法调用 ElMessage / message，show-error.ts 降级为 console.error
  // 用户可以之后自己替换为项目实际使用的通知组件
  await execa('node', [BIN, 'test-no-ui', '--yes', '--ui=none', '--harness=none'], { cwd: TMP, stdio: 'pipe' })
  const root = path.join(TMP, 'test-no-ui')
  const showErr = await fse.readFile(path.join(root, 'src/utils/show-error.ts'), 'utf-8')
  assert.ok(showErr.includes('console.error'), '无 UI 库时 show-error 应使用 console.error')
})
