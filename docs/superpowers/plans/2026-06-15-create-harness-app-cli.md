# create-harness-app CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@dianzhong/create-harness-app` — a CLI that wraps create-vue and overlays axios layer, UI library integration, and AI harness governance to produce a ready-to-use 点众科技 Vue 3 project.

**Architecture:** @clack/prompts collects config → execa spawns create-vue non-interactively → overlay engine copies templates + merges package.json fields + injects anchors into main.ts/vite.config.ts. No template engine — plain file copy + string anchor injection. Static templates in `templates/`.

**Tech Stack:** Node.js 22, TypeScript 5.7, tsup (ESM), @clack/prompts, execa, fs-extra, Node built-in test runner

---

## File Structure

**CLI source:**
- `src/index.ts` — entry: parse argv, prompts or CI mode, orchestrate
- `src/prompts.ts` — `UserConfig` type + @clack/prompts interactive flow
- `src/spawn-create-vue.ts` — execa call to create-vue
- `src/overlay.ts` — run feature overlays, write merged package.json
- `src/merge-json.ts` — package.json field-level merge (never downgrade deps, scripts override)
- `src/inject.ts` — anchor-based string injection; throws `AnchorNotFoundError` if anchor missing
- `src/features/axios.ts` — copy axios templates + write show-error.ts
- `src/features/ui-element-plus.ts` — scss + main.ts + vite.config.ts injection
- `src/features/ui-antdv.ts` — main.ts + vite.config.ts injection
- `src/features/harness.ts` — copy full/minimal harness snapshot + pkg additions
- `src/utils/logger.ts` — picocolors colored output
- `src/utils/fs.ts` — fs-extra wrappers (copyDir, readText, writeText, readJson, writeJson)
- `src/utils/spawn.ts` — execa wrapper (run)

**Templates:**
- `templates/axios/src/api/request.ts` — showError() instead of ElMessage
- `templates/axios/src/api/auth.ts` — generic example API
- `templates/axios/src/types/api.ts` — ApiResponse, PageParams, PageResult
- `templates/axios/src/utils/auth.ts` — token helpers
- `templates/axios/src/utils/storage.ts` — localStorage helpers
- `templates/axios/.env.example`
- `templates/harness/full/` — snapshot from project-manage
- `templates/harness/minimal/` — guard-tool + quality-gate + minimal settings + CLAUDE.md

**Tests:**
- `tests/merge-json.test.ts` — unit (TDD)
- `tests/inject.test.ts` — unit (TDD)
- `tests/e2e/generate.test.ts` — generate project, assert files exist

---

## Task 1: Project Foundation

**Files:** `package.json` (update), `tsconfig.json` (new), `tsup.config.ts` (new), `.gitignore` (new)

- [ ] **Step 1.1: Update package.json**

Replace `/Users/tianshiyang/Desktop/点众科技/create-harness-app/package.json`:

```json
{
  "name": "@dianzhong/create-harness-app",
  "version": "0.1.0",
  "description": "点众前端项目初始化器：封装 create-vue，叠加 UI 库、axios 层与 AI Harness 治理体系",
  "type": "module",
  "bin": { "create-harness-app": "dist/index.mjs" },
  "files": ["dist/", "templates/"],
  "engines": { "node": "^20.19.0 || >=22.12.0" },
  "keywords": ["create-vue", "scaffold", "harness", "vue3"],
  "license": "MIT",
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "node --test --experimental-strip-types tests/merge-json.test.ts tests/inject.test.ts",
    "test:e2e": "node --experimental-strip-types tests/e2e/generate.test.ts"
  },
  "dependencies": {
    "@clack/prompts": "^0.10.0",
    "execa": "^9.0.0",
    "fs-extra": "^11.3.0",
    "picocolors": "^1.1.1"
  },
  "devDependencies": {
    "@types/fs-extra": "^11.0.4",
    "@types/node": "^22.0.0",
    "tsup": "^8.5.0",
    "typescript": "~5.7.0"
  }
}
```

- [ ] **Step 1.2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": false
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "templates", "tests"]
}
```

- [ ] **Step 1.3: Create tsup.config.ts**

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  outDir: 'dist',
  banner: { js: '#!/usr/bin/env node' },
  outExtension: () => ({ js: '.mjs' }),
  platform: 'node',
})
```

- [ ] **Step 1.4: Create .gitignore**

```
node_modules/
dist/
*.log
.DS_Store
tmp/
test-output/
```

- [ ] **Step 1.5: Create directory skeleton**

```bash
cd /Users/tianshiyang/Desktop/点众科技/create-harness-app
mkdir -p src/utils src/features \
  templates/axios/src/api templates/axios/src/types templates/axios/src/utils \
  templates/harness/full/.claude/hooks templates/harness/minimal/.claude/hooks \
  tests/e2e
```

- [ ] **Step 1.6: Install**

```bash
cd /Users/tianshiyang/Desktop/点众科技/create-harness-app
pnpm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 1.7: Commit**

```bash
cd /Users/tianshiyang/Desktop/点众科技/create-harness-app
git add package.json tsconfig.json tsup.config.ts .gitignore
git commit -m "chore: project foundation — deps, tsup, tsconfig"
```

---

## Task 2: Core Utilities + TDD for merge-json & inject

**Files:** `src/utils/logger.ts`, `src/utils/fs.ts`, `src/utils/spawn.ts`, `src/merge-json.ts`, `src/inject.ts`, `tests/merge-json.test.ts`, `tests/inject.test.ts`

- [ ] **Step 2.1: Write failing tests for merge-json first**

Create `tests/merge-json.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergePackageJson } from '../src/merge-json.ts'

test('adds new dependency', () => {
  const result = mergePackageJson(
    { dependencies: { vue: '^3.5.0' } },
    { dependencies: { axios: '^1.16.0' } }
  )
  assert.equal((result.dependencies as Record<string, string>).axios, '^1.16.0')
  assert.equal((result.dependencies as Record<string, string>).vue, '^3.5.0')
})

test('does not downgrade existing dep', () => {
  const result = mergePackageJson(
    { dependencies: { axios: '^2.0.0' } },
    { dependencies: { axios: '^1.16.0' } }
  )
  assert.equal((result.dependencies as Record<string, string>).axios, '^2.0.0')
})

test('our scripts override existing scripts', () => {
  const result = mergePackageJson(
    { scripts: { dev: 'vite', check: 'echo old' } },
    { scripts: { check: 'pnpm type-check', 'harness:sync': 'node scripts/x' } }
  )
  assert.equal((result.scripts as Record<string, string>).check, 'pnpm type-check')
  assert.equal((result.scripts as Record<string, string>).dev, 'vite')
  assert.equal((result.scripts as Record<string, string>)['harness:sync'], 'node scripts/x')
})

test('preserves top-level non-dep fields', () => {
  const result = mergePackageJson(
    { name: 'my-app', version: '0.1.0', dependencies: {} },
    { dependencies: {} }
  )
  assert.equal(result.name as string, 'my-app')
})

test('adds devDependencies when absent', () => {
  const result = mergePackageJson({}, { devDependencies: { typescript: '~5.7.0' } })
  assert.equal((result.devDependencies as Record<string, string>).typescript, '~5.7.0')
})
```

- [ ] **Step 2.2: Verify tests FAIL**

```bash
cd /Users/tianshiyang/Desktop/点众科技/create-harness-app
node --test --experimental-strip-types tests/merge-json.test.ts 2>&1 | head -5
```

Expected: `Error: Cannot find module '../src/merge-json.ts'`

- [ ] **Step 2.3: Implement src/merge-json.ts**

```ts
type PkgJson = Record<string, unknown>

export interface MergeAdditions {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
}

export function mergePackageJson(existing: PkgJson, additions: MergeAdditions): PkgJson {
  const result = { ...existing }

  if (additions.dependencies) {
    result.dependencies = mergeDeps(
      (existing.dependencies ?? {}) as Record<string, string>,
      additions.dependencies
    )
  }
  if (additions.devDependencies) {
    result.devDependencies = mergeDeps(
      (existing.devDependencies ?? {}) as Record<string, string>,
      additions.devDependencies
    )
  }
  if (additions.scripts) {
    result.scripts = {
      ...((existing.scripts ?? {}) as Record<string, string>),
      ...additions.scripts,
    }
  }
  return result
}

function mergeDeps(
  existing: Record<string, string>,
  additions: Record<string, string>
): Record<string, string> {
  const result = { ...existing }
  for (const [pkg, version] of Object.entries(additions)) {
    if (!(pkg in result)) result[pkg] = version
  }
  return result
}
```

- [ ] **Step 2.4: Verify tests PASS**

```bash
node --test --experimental-strip-types tests/merge-json.test.ts
```

Expected: `✓ 5 tests passed`

- [ ] **Step 2.5: Write failing tests for inject**

Create `tests/inject.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { insertAfter, insertBefore, hasMarker, AnchorNotFoundError } from '../src/inject.ts'

test('insertAfter inserts immediately after anchor', () => {
  const src = `const app = createApp(App)\napp.mount('#app')`
  const result = insertAfter(src, 'const app = createApp(App)', `\napp.use(router)`)
  assert.ok(result.includes('const app = createApp(App)\napp.use(router)\napp.mount'))
})

test('insertAfter throws when anchor missing', () => {
  assert.throws(
    () => insertAfter('hello', 'NOTFOUND', 'x', 'f.ts'),
    (e: unknown) => e instanceof AnchorNotFoundError
  )
})

test('insertBefore inserts before anchor', () => {
  const src = `export default defineConfig({\n  plugins: [],\n})`
  const result = insertBefore(src, 'export default defineConfig(', `import X from 'x'\n`)
  assert.ok(result.startsWith("import X from 'x'\n"))
  assert.ok(result.includes('export default defineConfig('))
})

test('insertBefore throws when anchor missing', () => {
  assert.throws(
    () => insertBefore('hello', 'NOTFOUND', 'x', 'f.ts'),
    (e: unknown) => e instanceof AnchorNotFoundError
  )
})

test('hasMarker true when present', () => {
  assert.equal(hasMarker('// EP_INJECTED\nfoo', '// EP_INJECTED'), true)
})

test('hasMarker false when absent', () => {
  assert.equal(hasMarker('foo bar', '// EP_INJECTED'), false)
})

test('idempotency via hasMarker guard', () => {
  const marker = '// MARKER'
  let src = 'const app = createApp(App)\napp.mount("#app")'
  if (!hasMarker(src, marker)) {
    src = `${marker}\n` + insertAfter(src, 'const app = createApp(App)', `\napp.use(X)`)
  }
  const before = src
  if (!hasMarker(src, marker)) {
    src = insertAfter(src, 'const app = createApp(App)', `\napp.use(X)`)
  }
  assert.equal(src, before)
})
```

- [ ] **Step 2.6: Verify inject tests FAIL**

```bash
node --test --experimental-strip-types tests/inject.test.ts 2>&1 | head -5
```

Expected: `Cannot find module '../src/inject.ts'`

- [ ] **Step 2.7: Implement src/inject.ts**

```ts
export class AnchorNotFoundError extends Error {
  constructor(anchor: string, file: string) {
    super(`Anchor not found in "${file}": ${JSON.stringify(anchor)}`)
    this.name = 'AnchorNotFoundError'
  }
}

export function insertAfter(
  source: string,
  anchor: string,
  insertion: string,
  filePath = '<unknown>'
): string {
  const idx = source.indexOf(anchor)
  if (idx === -1) throw new AnchorNotFoundError(anchor, filePath)
  const end = idx + anchor.length
  return source.slice(0, end) + insertion + source.slice(end)
}

export function insertBefore(
  source: string,
  anchor: string,
  insertion: string,
  filePath = '<unknown>'
): string {
  const idx = source.indexOf(anchor)
  if (idx === -1) throw new AnchorNotFoundError(anchor, filePath)
  return source.slice(0, idx) + insertion + source.slice(idx)
}

export function hasMarker(source: string, marker: string): boolean {
  return source.includes(marker)
}
```

- [ ] **Step 2.8: Verify inject tests PASS**

```bash
node --test --experimental-strip-types tests/inject.test.ts
```

Expected: `✓ 7 tests passed`

- [ ] **Step 2.9: Create utilities**

`src/utils/logger.ts`:
```ts
import pc from 'picocolors'
export const info    = (msg: string) => console.log(pc.cyan(`  ${msg}`))
export const success = (msg: string) => console.log(pc.green(`✓ ${msg}`))
export const warn    = (msg: string) => console.log(pc.yellow(`⚠ ${msg}`))
export const error   = (msg: string) => console.error(pc.red(`✗ ${msg}`))
export const log     = (msg: string) => console.log(msg)
```

`src/utils/fs.ts`:
```ts
import fse from 'fs-extra'
import path from 'node:path'

export async function copyDir(src: string, dest: string): Promise<void> {
  await fse.ensureDir(dest)
  await fse.copy(src, dest, { overwrite: true })
}
export async function readText(p: string): Promise<string> { return fse.readFile(p, 'utf-8') }
export async function writeText(p: string, content: string): Promise<void> {
  await fse.ensureDir(path.dirname(p))
  return fse.writeFile(p, content, 'utf-8')
}
export async function readJson(p: string): Promise<unknown> { return fse.readJson(p) }
export async function writeJson(p: string, data: unknown): Promise<void> {
  await fse.ensureDir(path.dirname(p))
  return fse.writeJson(p, data, { spaces: 2 })
}
```

`src/utils/spawn.ts`:
```ts
import { execa } from 'execa'
export async function run(cmd: string, args: string[], opts: { cwd?: string } = {}): Promise<void> {
  await execa(cmd, args, { cwd: opts.cwd, stdio: 'inherit' })
}
```

- [ ] **Step 2.10: Create stub src/index.ts so tsup has an entry**

```ts
// Filled in Task 7
export {}
```

- [ ] **Step 2.11: Build to confirm TypeScript compiles**

```bash
cd /Users/tianshiyang/Desktop/点众科技/create-harness-app
pnpm build 2>&1
```

Expected: `dist/index.mjs` created, zero errors.

- [ ] **Step 2.12: Commit**

```bash
git add src/ tests/merge-json.test.ts tests/inject.test.ts
git commit -m "feat: core utils + merge-json + inject (TDD, 12 tests passing)"
```

---

## Task 3: axios Template Snapshot

**Files:** `templates/axios/**`

- [ ] **Step 3.1: Create templates/axios/src/api/request.ts**

ElMessage replaced with `showError()`. `showError` is provided by the axios overlay (see Task 5):

```ts
import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import type { ApiResponse } from '@/types/api'
import { getAccessToken, removeAccessToken } from '@/utils/auth'
import { showError } from '@/utils/show-error'

const axiosInstance = axios.create({
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

axiosInstance.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

axiosInstance.interceptors.response.use(
  (response) => {
    const res = response.data as ApiResponse<unknown>
    if (res.code === 401) {
      removeAccessToken()
      window.location.href = '/login'
      return Promise.reject(new Error(res.msg || '登录已过期'))
    }
    if (res.code !== 200) {
      showError(res.msg || '请求失败')
      return Promise.reject(new Error(res.msg || '请求失败'))
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      removeAccessToken()
      window.location.href = '/login'
      return Promise.reject(new Error('登录已过期'))
    }
    const message = error.response?.data?.msg || error.message || '网络异常'
    showError(message)
    return Promise.reject(new Error(message))
  },
)

export default function request<T>(config: {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: unknown
  params?: unknown
  headers?: Record<string, string>
  onUploadProgress?: (progressEvent: { loaded: number; total?: number }) => void
}): Promise<T> {
  const axiosConfig: AxiosRequestConfig = {
    url: config.url,
    method: config.method,
    data: config.data,
    params: config.params,
    onUploadProgress: config.onUploadProgress,
    headers: { ...config.headers },
  }
  return axiosInstance(axiosConfig).then((res) => (res.data as ApiResponse<T>).data)
}
```

- [ ] **Step 3.2: Create templates/axios/src/api/auth.ts**

Generic example — not project-manage URLs:

```ts
import request from './request'

/** 用户名密码登录 */
export function loginAPI(data: { username: string; password: string }) {
  return request<{ token: string }>({ url: '/api/auth/login', method: 'POST', data })
}

/** 退出登录 */
export function logoutAPI() {
  return request<void>({ url: '/api/auth/logout', method: 'POST' })
}

/** 获取当前用户信息 */
export function getUserInfoAPI() {
  return request<{ id: number; name: string; roles: string[] }>({
    url: '/api/auth/userInfo',
    method: 'GET',
  })
}
```

- [ ] **Step 3.3: Create templates/axios/src/types/api.ts**

Exact copy of project-manage/src/types/api.ts:

```ts
export interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

export interface PageParams {
  pageNo?: number
  limit?: number
}

export interface PageResult<T> {
  data: T[]
  pageNo: number
  limit: number
  totalNum: number
  totalPage: number
  /** 兼容后端 records 命名 */
  records?: T[]
  /** 兼容后端 total 命名 */
  total?: number
  /** 兼容后端 size 命名 */
  size?: number
  /** 兼容后端 current 命名 */
  current?: number
}
```

- [ ] **Step 3.4: Create templates/axios/src/utils/auth.ts**

Exact copy of project-manage/src/utils/auth.ts:

```ts
import { getStorageItem, removeStorageItem, setStorageItem } from './storage'

export function getAccessToken() { return getStorageItem('token') }
export function setAccessToken(token: string) { setStorageItem('token', token) }
export function removeAccessToken() { removeStorageItem('token') }
```

- [ ] **Step 3.5: Create templates/axios/src/utils/storage.ts**

Exact copy of project-manage/src/utils/storage.ts:

```ts
export function getStorageItem(key: string): string | null {
  return window.localStorage.getItem(key)
}
export function setStorageItem(key: string, value: string) {
  window.localStorage.setItem(key, value)
}
export function removeStorageItem(key: string) {
  window.localStorage.removeItem(key)
}
export function getJsonStorageItem<T>(key: string): T | null {
  const raw = getStorageItem(key)
  if (!raw) return null
  try { return JSON.parse(raw) as T } catch { removeStorageItem(key); return null }
}
export function setJsonStorageItem<T>(key: string, value: T) {
  setStorageItem(key, JSON.stringify(value))
}
```

- [ ] **Step 3.6: Create templates/axios/.env.example**

```
# API 基础路径，按部署环境修改
VITE_API_BASE_URL=http://localhost:8080
```

- [ ] **Step 3.7: Commit**

```bash
cd /Users/tianshiyang/Desktop/点众科技/create-harness-app
git add templates/axios/
git commit -m "feat: axios template snapshot (showError decoupled from ElMessage)"
```

---

## Task 4: Harness Template Snapshots

**Files:** `templates/harness/full/**`, `templates/harness/minimal/**`

- [ ] **Step 4.1: Copy hooks, agents, rules**

```bash
PM=/Users/tianshiyang/Desktop/点众科技/project-manage
FULL=/Users/tianshiyang/Desktop/点众科技/create-harness-app/templates/harness/full

mkdir -p $FULL/.claude/hooks $FULL/.claude/agents $FULL/.claude/rules

# hooks
cp $PM/.claude/hooks/guard-tool.cjs   $FULL/.claude/hooks/
cp $PM/.claude/hooks/quality-gate.cjs $FULL/.claude/hooks/
cp $PM/.claude/hooks/notify.cjs       $FULL/.claude/hooks/ 2>/dev/null || true

# agents
cp $PM/.claude/agents/code-reviewer.md    $FULL/.claude/agents/
cp $PM/.claude/agents/harness-reviewer.md $FULL/.claude/agents/ 2>/dev/null || true

# rules
cp $PM/.claude/rules/formatting.md  $FULL/.claude/rules/
cp $PM/.claude/rules/git.md         $FULL/.claude/rules/
cp $PM/.claude/rules/skills-mcp.md  $FULL/.claude/rules/
cp $PM/.claude/rules/delivery.md    $FULL/.claude/rules/
cp $PM/.claude/rules/vue.md         $FULL/.claude/rules/
```

- [ ] **Step 4.2: Copy skills (both locations)**

```bash
PM=/Users/tianshiyang/Desktop/点众科技/project-manage
FULL=/Users/tianshiyang/Desktop/点众科技/create-harness-app/templates/harness/full

mkdir -p $FULL/.claude/skills $FULL/.agents/skills

for SKILL in vue-best-practices find-skills; do
  cp -r $PM/.claude/skills/$SKILL $FULL/.claude/skills/ 2>/dev/null || true
  # mirror to .agents/skills
  cp -r $PM/.agents/skills/$SKILL $FULL/.agents/skills/ 2>/dev/null || \
    cp -r $PM/.claude/skills/$SKILL $FULL/.agents/skills/ 2>/dev/null || true
done

# skills-lock.json (will be regenerated by harness:sync)
cp $PM/skills-lock.json $FULL/ 2>/dev/null || echo '{"skills":{}}' > $FULL/skills-lock.json
```

- [ ] **Step 4.3: Copy scripts and docs**

```bash
PM=/Users/tianshiyang/Desktop/点众科技/project-manage
FULL=/Users/tianshiyang/Desktop/点众科技/create-harness-app/templates/harness/full

mkdir -p $FULL/scripts $FULL/docs

for SCRIPT in verify-skills.mjs harness-hooks.test.mjs verify-skills.test.mjs; do
  cp $PM/scripts/$SCRIPT $FULL/scripts/ 2>/dev/null || true
done

for DOC in ai-harness.md harness-quick-reference.md review-checklist.md delivery-template.md git.md; do
  cp $PM/docs/$DOC $FULL/docs/ 2>/dev/null || true
done
```

- [ ] **Step 4.4: Copy linting configs and settings.json**

```bash
PM=/Users/tianshiyang/Desktop/点众科技/project-manage
FULL=/Users/tianshiyang/Desktop/点众科技/create-harness-app/templates/harness/full

# claude settings (full version with agent review)
cp $PM/.claude/settings.json $FULL/.claude/

for F in .prettierrc.json .editorconfig .nvmrc .oxlintrc.json .lintstagedrc.json commitlint.config.ts; do
  cp $PM/$F $FULL/ 2>/dev/null || true
done

mkdir -p $FULL/.husky
cp $PM/.husky/pre-commit  $FULL/.husky/ 2>/dev/null || true
cp $PM/.husky/commit-msg  $FULL/.husky/ 2>/dev/null || true
```

- [ ] **Step 4.5: Create generic entry docs for full harness**

`templates/harness/full/CLAUDE.md`:
```markdown
# Claude Code 项目指南

本项目由 AI agent 辅助开发。Claude Code 是主要执行工具。

## 项目事实
- 技术栈：Vue 3、TypeScript、Vite、[在此填写 UI 库]、Pinia、Vue Router。
- 包管理器：pnpm。
- （在此补充：API 路径规范、路由约定、业务模型等项目专属信息）

## 工作流
- 先探索，再编辑；先读相关代码、规则和文档。
- 优先沿用项目已有模式，不轻易创建新抽象。
- 修改必须小而确定，可 review、可验证。

## Vue 实现
详细规则见 `.claude/rules/vue.md`。

## 质量门禁与安全
- 一般代码变更运行 `pnpm check`。
- Harness 变更先运行 `pnpm harness:sync`，再运行 `pnpm harness:check`。
- 不读取、不写入密钥文件（`.env*`、私钥、证书）。
- 不自动提交；未经允许不执行破坏性操作。

## Skills 与 Agent
skill 决策见 `docs/harness-quick-reference.md`。

## Git
Commit message 使用 Conventional Commits（见 `docs/git.md`）。
```

`templates/harness/full/AGENTS.md`:
```markdown
# Agents Guide

See CLAUDE.md for the full project guide.
```

`templates/harness/full/GEMINI.md`:
```markdown
# Gemini Project Guide

See CLAUDE.md for the full project guide.
```

- [ ] **Step 4.6: Create minimal harness template**

```bash
PM=/Users/tianshiyang/Desktop/点众科技/project-manage
MIN=/Users/tianshiyang/Desktop/点众科技/create-harness-app/templates/harness/minimal

mkdir -p $MIN/.claude/hooks
cp $PM/.claude/hooks/guard-tool.cjs   $MIN/.claude/hooks/
cp $PM/.claude/hooks/quality-gate.cjs $MIN/.claude/hooks/
```

`templates/harness/minimal/.claude/settings.json`:
```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Read", "Glob", "Grep",
      "Bash(git status*)", "Bash(git diff*)", "Bash(git log*)", "Bash(git show*)",
      "Bash(pnpm *)", "Bash(node *)"
    ],
    "deny": [
      "Read(.env*)", "Read(**/.env*)",
      "Read(*.pem)", "Read(**/*.pem)", "Read(*.key)", "Read(**/*.key)",
      "Bash(git reset --hard*)", "Bash(git push --force*)",
      "Bash(rm -rf*)", "Bash(git commit*)"
    ]
  },
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash|Read|Write|Edit|MultiEdit|Grep|Agent",
      "hooks": [{ "type": "command", "command": "node .claude/hooks/guard-tool.cjs", "timeout": 10 }]
    }],
    "Stop": [{
      "matcher": ".*",
      "hooks": [{ "type": "command", "command": "node .claude/hooks/quality-gate.cjs stop", "timeout": 300 }]
    }]
  },
  "disableBypassPermissionsMode": "disable"
}
```

`templates/harness/minimal/CLAUDE.md`:
```markdown
# Claude Code 项目指南

本项目使用最小 harness 配置：安全守护（guard-tool）+ 质量门禁（quality-gate）。

## 项目事实
- 技术栈：Vue 3、TypeScript、Vite
- 包管理器：pnpm

## 质量门禁
- 代码变更运行 `pnpm check`（type-check + lint + format:check）。
- 不读取、不写入密钥文件。
- 不自动提交。
```

- [ ] **Step 4.7: Commit**

```bash
cd /Users/tianshiyang/Desktop/点众科技/create-harness-app
git add templates/harness/
git commit -m "feat: harness template snapshots (full + minimal)"
```

---

## Task 5: Feature Implementations

**Files:** `src/features/axios.ts`, `src/features/ui-element-plus.ts`, `src/features/ui-antdv.ts`, `src/features/harness.ts`

- [ ] **Step 5.1: Create src/features/axios.ts**

```ts
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { copyDir, writeText } from '../utils/fs.ts'
import type { MergeAdditions } from '../merge-json.ts'
import type { UserConfig } from '../prompts.ts'

const TEMPLATES_DIR = fileURLToPath(new URL('../../templates', import.meta.url))

export const AXIOS_PKG: MergeAdditions = {
  dependencies: { axios: '^1.16.0' },
}

const SHOW_ERROR: Record<UserConfig['uiLibrary'], string> = {
  'element-plus': `import { ElMessage } from 'element-plus'

export function showError(msg: string): void {
  ElMessage.error(msg)
}
`,
  'ant-design-vue': `import { message } from 'ant-design-vue'

export function showError(msg: string): void {
  message.error(msg)
}
`,
  'none': `// TODO: Replace with your UI library's notification component
export function showError(msg: string): void {
  console.error('[API Error]', msg)
}
`,
}

export async function overlayAxios(projectRoot: string, config: UserConfig): Promise<void> {
  await copyDir(path.join(TEMPLATES_DIR, 'axios'), projectRoot)
  await writeText(
    path.join(projectRoot, 'src/utils/show-error.ts'),
    SHOW_ERROR[config.uiLibrary]
  )
}
```

- [ ] **Step 5.2: Create src/features/ui-element-plus.ts**

create-vue generates `main.ts` with `import { createApp } from 'vue'` and `const app = createApp(App)`.
create-vue generates `vite.config.ts` with `export default defineConfig({` and `plugins: [`.

```ts
import path from 'node:path'
import { readText, writeText } from '../utils/fs.ts'
import { insertAfter, insertBefore, hasMarker } from '../inject.ts'
import type { MergeAdditions } from '../merge-json.ts'

const EP_MARKER = '// ELEMENT_PLUS_INJECTED'

const VITE_IMPORTS = `import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
`
const VITE_PLUGINS = `
    AutoImport({ resolvers: [ElementPlusResolver()] }),
    Components({ resolvers: [ElementPlusResolver()] }),`

const MAIN_IMPORTS = `import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/element-plus.scss'
`
const SCSS_CONTENT = `/* Element Plus 主题覆盖
 * 文档: https://element-plus.org/en-US/guide/theming.html
 */
`

export const ELEMENT_PLUS_PKG: MergeAdditions = {
  dependencies: {
    'element-plus': '^2.13.7',
    '@element-plus/icons-vue': '^2.3.2',
  },
  devDependencies: {
    'unplugin-auto-import': '^21.0.0',
    'unplugin-vue-components': '^32.0.0',
    'sass': '^1.95.1',
  },
}

export async function overlayElementPlus(projectRoot: string): Promise<void> {
  await writeText(path.join(projectRoot, 'src/styles/element-plus.scss'), SCSS_CONTENT)

  const mainPath = path.join(projectRoot, 'src/main.ts')
  let main = await readText(mainPath)
  if (!hasMarker(main, EP_MARKER)) {
    main = insertBefore(main, 'import { createApp }', `${EP_MARKER}\n${MAIN_IMPORTS}`, mainPath)
    main = insertAfter(main, 'const app = createApp(App)', `\napp.use(ElementPlus)`, mainPath)
    await writeText(mainPath, main)
  }

  const vitePath = path.join(projectRoot, 'vite.config.ts')
  let vite = await readText(vitePath)
  if (!hasMarker(vite, EP_MARKER)) {
    vite = insertBefore(vite, 'export default defineConfig(', `${EP_MARKER}\n${VITE_IMPORTS}`, vitePath)
    vite = insertAfter(vite, 'plugins: [', VITE_PLUGINS, vitePath)
    await writeText(vitePath, vite)
  }
}
```

- [ ] **Step 5.3: Create src/features/ui-antdv.ts**

```ts
import path from 'node:path'
import { readText, writeText } from '../utils/fs.ts'
import { insertAfter, insertBefore, hasMarker } from '../inject.ts'
import type { MergeAdditions } from '../merge-json.ts'

const ANTDV_MARKER = '// ANT_DESIGN_VUE_INJECTED'

const VITE_IMPORTS = `import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
`
const VITE_PLUGINS = `
    Components({ resolvers: [AntDesignVueResolver()] }),`

const MAIN_IMPORTS = `import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
`

export const ANTDV_PKG: MergeAdditions = {
  dependencies: {
    'ant-design-vue': '^4.2.0',
    '@ant-design/icons-vue': '^7.0.0',
  },
  devDependencies: {
    'unplugin-vue-components': '^32.0.0',
  },
}

export async function overlayAntdv(projectRoot: string): Promise<void> {
  const mainPath = path.join(projectRoot, 'src/main.ts')
  let main = await readText(mainPath)
  if (!hasMarker(main, ANTDV_MARKER)) {
    main = insertBefore(main, 'import { createApp }', `${ANTDV_MARKER}\n${MAIN_IMPORTS}`, mainPath)
    main = insertAfter(main, 'const app = createApp(App)', `\napp.use(Antd)`, mainPath)
    await writeText(mainPath, main)
  }

  const vitePath = path.join(projectRoot, 'vite.config.ts')
  let vite = await readText(vitePath)
  if (!hasMarker(vite, ANTDV_MARKER)) {
    vite = insertBefore(vite, 'export default defineConfig(', `${ANTDV_MARKER}\n${VITE_IMPORTS}`, vitePath)
    vite = insertAfter(vite, 'plugins: [', VITE_PLUGINS, vitePath)
    await writeText(vitePath, vite)
  }
}
```

- [ ] **Step 5.4: Create src/features/harness.ts**

```ts
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { copyDir } from '../utils/fs.ts'
import type { MergeAdditions } from '../merge-json.ts'

const TEMPLATES_DIR = fileURLToPath(new URL('../../templates', import.meta.url))

export const HARNESS_FULL_PKG: MergeAdditions = {
  devDependencies: {
    'oxlint': '~1.57.0',
    '@commitlint/cli': '^20.2.0',
    '@commitlint/config-conventional': '^20.2.0',
    'lint-staged': '^16.2.7',
    'husky': '^9.1.7',
  },
  scripts: {
    'harness:sync': 'node scripts/verify-skills.mjs --write',
    'harness:check': 'node scripts/verify-skills.mjs && node scripts/harness-hooks.test.mjs',
    'harness:test': 'node scripts/harness-hooks.test.mjs && node scripts/verify-skills.test.mjs',
    'check': 'pnpm type-check && pnpm lint && pnpm format:check && pnpm harness:check',
  },
}

export const HARNESS_MINIMAL_PKG: MergeAdditions = {
  devDependencies: {},
  scripts: {
    'check': 'pnpm type-check && pnpm lint && pnpm format:check',
  },
}

export async function overlayHarness(projectRoot: string, level: 'full' | 'minimal'): Promise<void> {
  await copyDir(path.join(TEMPLATES_DIR, 'harness', level), projectRoot)
}
```

- [ ] **Step 5.5: Commit**

```bash
cd /Users/tianshiyang/Desktop/点众科技/create-harness-app
git add src/features/
git commit -m "feat: feature overlay implementations (axios, element-plus, antdv, harness)"
```

---

## Task 6: Prompts Type + Overlay Orchestrator

**Files:** `src/prompts.ts` (replace stub), `src/overlay.ts`

- [ ] **Step 6.1: Create src/prompts.ts**

```ts
import { intro, text, select, confirm, isCancel, cancel } from '@clack/prompts'

export interface UserConfig {
  projectName: string
  router: boolean
  pinia: boolean
  vitest: boolean
  uiLibrary: 'element-plus' | 'ant-design-vue' | 'none'
  axios: boolean
  harness: 'full' | 'minimal' | 'none'
}

export function defaultConfig(projectName: string): UserConfig {
  return { projectName, router: true, pinia: true, vitest: false, uiLibrary: 'element-plus', axios: true, harness: 'full' }
}

function check<T>(val: T | symbol): T {
  if (isCancel(val)) { cancel('已取消'); process.exit(0) }
  return val as T
}

export async function collectConfig(initialName?: string): Promise<UserConfig> {
  intro('create-harness-app — 点众前端项目初始化器')

  const projectName = initialName ?? check(await text({
    message: '项目名称',
    placeholder: 'my-app',
    validate: (v) => /^[a-z][a-z0-9-]*$/.test(v) ? undefined : '请使用小写字母、数字和连字符',
  }))

  const router  = check(await confirm({ message: '启用 Vue Router？', initialValue: true }))
  const pinia   = check(await confirm({ message: '启用 Pinia 状态管理？', initialValue: true }))
  const vitest  = check(await confirm({ message: '启用 Vitest 单元测试？', initialValue: false }))

  const uiLibrary = check(await select<'element-plus' | 'ant-design-vue' | 'none'>({
    message: 'UI 组件库',
    options: [
      { value: 'element-plus', label: 'Element Plus（默认）' },
      { value: 'ant-design-vue', label: 'Ant Design Vue' },
      { value: 'none', label: '自己配置' },
    ],
  }))

  const axios = check(await confirm({ message: '集成 axios 请求层？', initialValue: true }))

  const harness = check(await select<'full' | 'minimal' | 'none'>({
    message: 'Harness 治理层',
    options: [
      { value: 'full', label: 'Full — 完整 hooks/rules/agents/skills（默认）' },
      { value: 'minimal', label: 'Minimal — 仅安全守护 + 质量门禁' },
      { value: 'none', label: '不集成' },
    ],
  }))

  return { projectName, router, pinia, vitest, uiLibrary, axios, harness }
}
```

- [ ] **Step 6.2: Create src/overlay.ts**

```ts
import path from 'node:path'
import { readJson, writeJson } from './utils/fs.ts'
import { mergePackageJson, type MergeAdditions } from './merge-json.ts'
import { overlayAxios, AXIOS_PKG } from './features/axios.ts'
import { overlayElementPlus, ELEMENT_PLUS_PKG } from './features/ui-element-plus.ts'
import { overlayAntdv, ANTDV_PKG } from './features/ui-antdv.ts'
import { overlayHarness, HARNESS_FULL_PKG, HARNESS_MINIMAL_PKG } from './features/harness.ts'
import type { UserConfig } from './prompts.ts'

export async function overlay(projectRoot: string, config: UserConfig): Promise<void> {
  const pkgPath = path.join(projectRoot, 'package.json')
  let pkg = await readJson(pkgPath) as Record<string, unknown>
  const add: MergeAdditions = { dependencies: {}, devDependencies: {}, scripts: {} }

  const merge = (src: MergeAdditions) => {
    if (src.dependencies)    Object.assign(add.dependencies!,    src.dependencies)
    if (src.devDependencies) Object.assign(add.devDependencies!, src.devDependencies)
    if (src.scripts)         Object.assign(add.scripts!,         src.scripts)
  }

  if (config.axios) {
    await overlayAxios(projectRoot, config)
    merge(AXIOS_PKG)
  }

  if (config.uiLibrary === 'element-plus') {
    await overlayElementPlus(projectRoot)
    merge(ELEMENT_PLUS_PKG)
  } else if (config.uiLibrary === 'ant-design-vue') {
    await overlayAntdv(projectRoot)
    merge(ANTDV_PKG)
  }

  if (config.harness !== 'none') {
    await overlayHarness(projectRoot, config.harness)
    merge(config.harness === 'full' ? HARNESS_FULL_PKG : HARNESS_MINIMAL_PKG)
  }

  pkg = mergePackageJson(pkg, add)
  await writeJson(pkgPath, pkg)
}
```

- [ ] **Step 6.3: Build and check**

```bash
cd /Users/tianshiyang/Desktop/点众科技/create-harness-app
pnpm build 2>&1
```

Expected: No TypeScript errors.

- [ ] **Step 6.4: Commit**

```bash
git add src/prompts.ts src/overlay.ts
git commit -m "feat: UserConfig type + overlay orchestrator"
```

---

## Task 7: create-vue Delegation + Main Entry

**Files:** `src/spawn-create-vue.ts`, `src/index.ts` (replace stub)

- [ ] **Step 7.1: Create src/spawn-create-vue.ts**

```ts
import { execa } from 'execa'
import type { UserConfig } from './prompts.ts'

export async function spawnCreateVue(config: UserConfig, parentDir: string): Promise<void> {
  const flags = [
    '--typescript',
    '--eslint-with-prettier',
    '--force',
    ...(config.router ? ['--router'] : []),
    ...(config.pinia  ? ['--pinia']  : []),
    ...(config.vitest ? ['--vitest'] : []),
  ]
  await execa('npx', ['--yes', 'create-vue@latest', config.projectName, ...flags], {
    cwd: parentDir,
    stdio: 'inherit',
  })
}
```

- [ ] **Step 7.2: Replace src/index.ts**

```ts
import path from 'node:path'
import fse from 'fs-extra'
import { outro } from '@clack/prompts'
import { collectConfig, defaultConfig, type UserConfig } from './prompts.ts'
import { spawnCreateVue } from './spawn-create-vue.ts'
import { overlay } from './overlay.ts'
import { info, success, error, log } from './utils/logger.ts'

function parseArgs(argv: string[]) {
  return {
    projectName: argv.find(a => !a.startsWith('-')),
    isYes:       argv.includes('--yes'),
    uiLibrary:   argv.find(a => a.startsWith('--ui='))?.split('=')[1]      as UserConfig['uiLibrary'] | undefined,
    harness:     argv.find(a => a.startsWith('--harness='))?.split('=')[1] as UserConfig['harness']   | undefined,
    noAxios:     argv.includes('--no-axios'),
    vitest:      argv.includes('--vitest'),
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    log(`Usage: create-harness-app [project-name] [options]

Options:
  --yes              Non-interactive: TS + Router + Pinia + ElementPlus + axios + harness:full
  --ui=<lib>         element-plus | ant-design-vue | none  (default: element-plus)
  --harness=<level>  full | minimal | none                 (default: full)
  --no-axios         Skip axios layer
  --vitest           Enable Vitest
  -h, --help         Show this help

Examples:
  npm create @dianzhong/harness-app my-app
  npm create @dianzhong/harness-app my-app -- --yes
  npm create @dianzhong/harness-app my-app -- --ui=ant-design-vue --harness=minimal
`)
    process.exit(0)
  }

  let config: UserConfig
  if (args.isYes || (args.projectName && args.uiLibrary !== undefined && args.harness !== undefined)) {
    const base = defaultConfig(args.projectName ?? 'my-app')
    config = { ...base, uiLibrary: args.uiLibrary ?? base.uiLibrary, harness: args.harness ?? base.harness, axios: !args.noAxios, vitest: args.vitest }
    info(`非交互模式: ${config.projectName} | UI=${config.uiLibrary} | harness=${config.harness}`)
  } else {
    config = await collectConfig(args.projectName)
  }

  const targetDir = path.resolve(process.cwd(), config.projectName)
  if (await fse.pathExists(targetDir)) {
    const entries = await fse.readdir(targetDir)
    if (entries.length > 0) {
      error(`目录 "${config.projectName}" 已存在且不为空`)
      process.exit(1)
    }
  }

  info('使用 create-vue 生成基础骨架...')
  await spawnCreateVue(config, path.dirname(targetDir))

  info('叠加 features...')
  await overlay(targetDir, config)

  success('项目初始化完成！')
  outro('下一步')
  log(`\n  cd ${config.projectName}`)
  log('  pnpm install')
  if (config.harness === 'full') log('  pnpm harness:sync   # 重算 skills 指纹')
  log('  pnpm dev\n')
}

main().catch((err) => {
  error(String((err as Error).message ?? err))
  process.exit(1)
})
```

- [ ] **Step 7.3: Build final binary**

```bash
cd /Users/tianshiyang/Desktop/点众科技/create-harness-app
pnpm build 2>&1
```

Expected: `dist/index.mjs` created, zero TypeScript errors.

- [ ] **Step 7.4: Verify shebang**

```bash
head -1 dist/index.mjs
```

Expected: `#!/usr/bin/env node`

- [ ] **Step 7.5: Verify --help works**

```bash
node dist/index.mjs --help
```

Expected: Usage text printed, exit 0.

- [ ] **Step 7.6: Commit**

```bash
git add src/spawn-create-vue.ts src/index.ts
git commit -m "feat: create-vue delegation + main CLI entry"
```

---

## Task 8: E2E Tests

**Files:** `tests/e2e/generate.test.ts`

- [ ] **Step 8.1: Create tests/e2e/generate.test.ts**

```ts
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

  // base
  assert.ok(await fse.pathExists(path.join(root, 'src/main.ts')))
  assert.ok(await fse.pathExists(path.join(root, 'vite.config.ts')))

  // axios
  assert.ok(await fse.pathExists(path.join(root, 'src/api/request.ts')))
  assert.ok(await fse.pathExists(path.join(root, 'src/utils/show-error.ts')))
  assert.ok(await fse.pathExists(path.join(root, 'src/types/api.ts')))
  const showErr = await fse.readFile(path.join(root, 'src/utils/show-error.ts'), 'utf-8')
  assert.ok(showErr.includes('ElMessage'), 'show-error must use ElMessage for element-plus default')

  // element-plus injection
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
  assert.ok(await fse.pathExists(path.join(root, '.claude/hooks/guard-tool.cjs')))
  assert.ok(await fse.pathExists(path.join(root, '.claude/hooks/quality-gate.cjs')))
  assert.ok(await fse.pathExists(path.join(root, 'CLAUDE.md')))
}, { timeout: 180_000 })

test('--harness=none skips harness files', async () => {
  await execa('node', [BIN, 'test-no-harness', '--yes', '--harness=none'], { cwd: TMP, stdio: 'pipe' })
  const root = path.join(TMP, 'test-no-harness')
  assert.equal(await fse.pathExists(path.join(root, '.claude/hooks/guard-tool.cjs')), false)
  assert.equal(await fse.pathExists(path.join(root, 'CLAUDE.md')), false)
}, { timeout: 180_000 })

test('--ui=none uses console.error show-error', async () => {
  await execa('node', [BIN, 'test-no-ui', '--yes', '--ui=none', '--harness=none'], { cwd: TMP, stdio: 'pipe' })
  const root = path.join(TMP, 'test-no-ui')
  const showErr = await fse.readFile(path.join(root, 'src/utils/show-error.ts'), 'utf-8')
  assert.ok(showErr.includes('console.error'))
}, { timeout: 180_000 })
```

- [ ] **Step 8.2: Run unit tests baseline**

```bash
cd /Users/tianshiyang/Desktop/点众科技/create-harness-app
node --test --experimental-strip-types tests/merge-json.test.ts tests/inject.test.ts
```

Expected: 12 tests passed.

- [ ] **Step 8.3: Run E2E tests**

```bash
node --experimental-strip-types tests/e2e/generate.test.ts 2>&1
```

Expected: 3 E2E tests pass (~1-3 min total). **Common failure modes:**

- Anchor mismatch: if create-vue changes `main.ts` structure so `import { createApp }` or `const app = createApp(App)` doesn't match exactly, check actual output with `cat /tmp/harness-e2e-*/test-app/src/main.ts` and update anchors in `ui-element-plus.ts` / `ui-antdv.ts`.
- `import.meta.url` path: in the bundled `dist/index.mjs`, `import.meta.url` resolves relative to `dist/`. The `../../templates` pattern resolves to `<project-root>/templates/` which is correct.

- [ ] **Step 8.4: Commit**

```bash
git add tests/e2e/
git commit -m "test: E2E generation tests — 3 scenarios"
```

---

## Self-Review: Spec Coverage

| Spec section | Covered in |
|---|---|
| cli-scaffolding: argv parsing | Task 7 `parseArgs` |
| cli-scaffolding: @clack/prompts flow | Task 6 `collectConfig` |
| cli-scaffolding: TS+ESLint forced (not shown as optional) | Task 7 `spawnCreateVue` hardcoded flags |
| cli-scaffolding: CI mode `--yes` | Task 7 `main()` |
| cli-scaffolding: dir existence check | Task 7 `fse.pathExists` |
| project-overlay: direct copy | Task 5 `copyDir` |
| project-overlay: pkg.json field merge | Tasks 2+6 `mergePackageJson` |
| project-overlay: main.ts anchor injection | Task 5 `ui-element-plus` / `ui-antdv` |
| project-overlay: vite.config anchor injection | Task 5 `ui-element-plus` / `ui-antdv` |
| project-overlay: fail-fast on missing anchor | Task 2 `AnchorNotFoundError` |
| feature-ui-library: EP AutoImport/Components/scss | Task 5.2 |
| feature-ui-library: AntDV AntDesignVueResolver | Task 5.3 |
| feature-ui-library: none → console.error | Task 5.1 `SHOW_ERROR.none` |
| feature-ui-library: showError decoupled | Tasks 3+5 |
| feature-axios-layer: request.ts showError | Task 3.1 |
| feature-axios-layer: types, auth, storage | Tasks 3.3-3.5 |
| feature-axios-layer: .env.example | Task 3.6 |
| feature-harness-layer: full snapshot | Task 4.1-4.5 |
| feature-harness-layer: minimal snapshot | Task 4.6 |
| feature-harness-layer: scripts injection | Task 5.4 `HARNESS_FULL_PKG.scripts` |
| Tasks.md 8.3: generated project builds | Manual post-E2E: `cd test-app && pnpm install && pnpm type-check` |
