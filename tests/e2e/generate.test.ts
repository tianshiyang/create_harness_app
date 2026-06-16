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

test('--yes 默认模式：生成 axios + Element Plus + Harness Full + OpenSpec 的完整项目', { timeout: 240_000 }, async () => {
  // --yes 等同于：TS + Router + Pinia + Element Plus + axios + harness:full + openspec，全部用默认值，不弹交互提示
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
  // check 脚本引用了 format:check，必须从 create-vue 的 format 派生出来，否则 pnpm check 会报 "Command format:check not found"
  assert.ok(pkg.scripts?.['format:check'], 'package.json 缺少 format:check 脚本（check 脚本会用到）')
  assert.ok(pkg.scripts['format:check'].includes('--check'), 'format:check 应使用 prettier --check')
  // husky 必须有 prepare 脚本才会在 install 时激活 hook
  assert.equal(pkg.scripts?.['prepare'], 'husky', 'package.json 缺少 prepare: husky')
  assert.ok(pkg.scripts?.['check:fix'], 'package.json 缺少 check:fix 脚本')

  // Harness Full 必须包含安全 hook 和 CLAUDE.md
  assert.ok(await fse.pathExists(path.join(root, '.claude/hooks/guard-tool.cjs')), 'guard-tool.cjs 不存在')
  assert.ok(await fse.pathExists(path.join(root, '.claude/hooks/quality-gate.cjs')), 'quality-gate.cjs 不存在')
  assert.ok(await fse.pathExists(path.join(root, 'CLAUDE.md')), 'CLAUDE.md 不存在')
  // CLAUDE.md 的 UI 库占位符应被实际值替换
  const claude = await fse.readFile(path.join(root, 'CLAUDE.md'), 'utf-8')
  assert.ok(claude.includes('Element Plus'), 'CLAUDE.md UI 库占位符未被填充为 Element Plus')
  assert.ok(!claude.includes('[在此填写 UI 库]'), 'CLAUDE.md 仍残留 UI 库占位符')

  // OpenSpec（默认开）：openspec/ 目录、opsx 命令、lock 含 openspec skills、check 串接 openspec:validate
  assert.ok(await fse.pathExists(path.join(root, 'openspec')), 'openspec/ 目录不存在')
  assert.ok(await fse.pathExists(path.join(root, '.claude/commands/opsx')), '.claude/commands/opsx 不存在')
  assert.ok(await fse.pathExists(path.join(root, 'docs/openspec.md')), 'docs/openspec.md 不存在')
  assert.ok(pkg.scripts?.['openspec:validate'], 'package.json 缺少 openspec:validate 脚本')
  assert.ok(pkg.scripts['check'].includes('openspec:validate'), 'check 脚本未串接 openspec:validate')
  const lock = await fse.readJson(path.join(root, 'skills-lock.json'))
  const skillNames = Object.keys(lock.skills)
  assert.ok(skillNames.some((s) => s.startsWith('openspec-')), 'skills-lock.json 未包含 openspec-* skill（init 后未重算 lock）')
  assert.ok(skillNames.includes('vue-best-practices'), 'skills-lock.json 丢失了基础 skill vue-best-practices')
})

test('--harness=none：跳过 Harness，不生成 .claude/ 和 CLAUDE.md', { timeout: 180_000 }, async () => {
  // 用户选择不集成 Harness 治理层时，.claude/ 目录和 CLAUDE.md 都不应该出现
  await execa('node', [BIN, 'test-no-harness', '--yes', '--harness=none', '--no-openspec'], { cwd: TMP, stdio: 'pipe' })
  const root = path.join(TMP, 'test-no-harness')
  assert.equal(await fse.pathExists(path.join(root, '.claude/hooks/guard-tool.cjs')), false, 'guard-tool.cjs 不应存在')
  assert.equal(await fse.pathExists(path.join(root, 'CLAUDE.md')), false, 'CLAUDE.md 不应存在')
})

test('--ui=none：不集成 UI 库时，show-error 使用 console.error', { timeout: 180_000 }, async () => {
  // 没有 UI 库就无法调用 ElMessage / message，show-error.ts 降级为 console.error
  // 用户可以之后自己替换为项目实际使用的通知组件
  await execa('node', [BIN, 'test-no-ui', '--yes', '--ui=none', '--harness=none', '--no-openspec'], { cwd: TMP, stdio: 'pipe' })
  const root = path.join(TMP, 'test-no-ui')
  const showErr = await fse.readFile(path.join(root, 'src/utils/show-error.ts'), 'utf-8')
  assert.ok(showErr.includes('console.error'), '无 UI 库时 show-error 应使用 console.error')
})
