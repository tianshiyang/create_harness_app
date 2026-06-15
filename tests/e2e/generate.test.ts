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

test('--yes generates axios + element-plus + harness full', async () => {
  await execa('node', [BIN, 'test-app', '--yes'], { cwd: TMP, stdio: 'pipe' })
  const root = path.join(TMP, 'test-app')

  // base scaffold
  assert.ok(await fse.pathExists(path.join(root, 'src/main.ts')), 'main.ts missing')
  assert.ok(await fse.pathExists(path.join(root, 'vite.config.ts')), 'vite.config.ts missing')

  // axios layer
  assert.ok(await fse.pathExists(path.join(root, 'src/api/request.ts')), 'request.ts missing')
  assert.ok(await fse.pathExists(path.join(root, 'src/utils/show-error.ts')), 'show-error.ts missing')
  assert.ok(await fse.pathExists(path.join(root, 'src/types/api.ts')), 'api.ts missing')
  const showErr = await fse.readFile(path.join(root, 'src/utils/show-error.ts'), 'utf-8')
  assert.ok(showErr.includes('ElMessage'), 'show-error must use ElMessage for element-plus default')

  // element-plus injections
  const main = await fse.readFile(path.join(root, 'src/main.ts'), 'utf-8')
  assert.ok(main.includes('element-plus'), 'main.ts must import element-plus')
  assert.ok(main.includes('app.use(ElementPlus)'), 'main.ts must use ElementPlus')
  const vite = await fse.readFile(path.join(root, 'vite.config.ts'), 'utf-8')
  assert.ok(vite.includes('ElementPlusResolver'), 'vite.config.ts must have ElementPlusResolver')

  // package.json
  const pkg = await fse.readJson(path.join(root, 'package.json'))
  assert.ok(pkg.dependencies?.['element-plus'], 'must have element-plus dep')
  assert.ok(pkg.dependencies?.['axios'], 'must have axios dep')
  assert.ok(pkg.scripts?.['harness:sync'], 'must have harness:sync script')

  // harness full
  assert.ok(await fse.pathExists(path.join(root, '.claude/hooks/guard-tool.cjs')), 'guard-tool.cjs missing')
  assert.ok(await fse.pathExists(path.join(root, '.claude/hooks/quality-gate.cjs')), 'quality-gate.cjs missing')
  assert.ok(await fse.pathExists(path.join(root, 'CLAUDE.md')), 'CLAUDE.md missing')
}, { timeout: 180_000 })

test('--harness=none skips harness files', async () => {
  await execa('node', [BIN, 'test-no-harness', '--yes', '--harness=none'], { cwd: TMP, stdio: 'pipe' })
  const root = path.join(TMP, 'test-no-harness')
  assert.equal(await fse.pathExists(path.join(root, '.claude/hooks/guard-tool.cjs')), false, 'guard-tool must not exist')
  assert.equal(await fse.pathExists(path.join(root, 'CLAUDE.md')), false, 'CLAUDE.md must not exist')
}, { timeout: 180_000 })

test('--ui=none uses console.error show-error', async () => {
  await execa('node', [BIN, 'test-no-ui', '--yes', '--ui=none', '--harness=none'], { cwd: TMP, stdio: 'pipe' })
  const root = path.join(TMP, 'test-no-ui')
  const showErr = await fse.readFile(path.join(root, 'src/utils/show-error.ts'), 'utf-8')
  assert.ok(showErr.includes('console.error'), 'show-error must use console.error when no UI')
}, { timeout: 180_000 })
