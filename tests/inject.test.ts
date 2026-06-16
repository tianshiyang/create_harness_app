/**
 * inject 单元测试
 *
 * inject 模块负责「锚点注入」：在已有源文件的特定位置插入代码，
 * 用于把 Element Plus / Ant Design Vue 的初始化代码注入到 create-vue 生成的 main.ts 和 vite.config.ts。
 *
 * 核心设计：
 *   - insertAfter：在锚点文本之后插入（如在 createApp 那行后面加 app.use(ElementPlus)）
 *   - insertBefore：在锚点文本之前插入（如在 export default defineConfig 前面加 import 语句）
 *   - hasMarker：幂等守卫——检查是否已经注入过，避免重复执行时二次注入
 *   - 锚点不存在时抛出 AnchorNotFoundError，而不是静默失败
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { insertAfter, insertBefore, hasMarker, AnchorNotFoundError } from '../src/inject.ts'

test('insertAfter：紧接在锚点后插入内容', () => {
  // 模拟 main.ts 片段，在 createApp 那行后面插入 app.use(router)
  const src = `const app = createApp(App)\napp.mount('#app')`
  const result = insertAfter(src, 'const app = createApp(App)', `\napp.use(router)`)
  assert.ok(result.includes('const app = createApp(App)\napp.use(router)\napp.mount'))
})

test('insertAfter：锚点不存在时抛出 AnchorNotFoundError', () => {
  // 如果 create-vue 未来改了 main.ts 格式导致锚点消失，要明确报错而非静默跳过
  assert.throws(
    () => insertAfter('hello', 'NOTFOUND', 'x', 'f.ts'),
    (e: unknown) => e instanceof AnchorNotFoundError
  )
})

test('insertBefore：紧接在锚点前插入内容', () => {
  // 模拟 vite.config.ts，在 export default defineConfig 前面加 import 语句
  const src = `export default defineConfig({\n  plugins: [],\n})`
  const result = insertBefore(src, 'export default defineConfig(', `import X from 'x'\n`)
  assert.ok(result.startsWith("import X from 'x'\n"), '插入内容应出现在文件开头')
  assert.ok(result.includes('export default defineConfig('), '原内容不应丢失')
})

test('insertBefore：锚点不存在时抛出 AnchorNotFoundError', () => {
  assert.throws(
    () => insertBefore('hello', 'NOTFOUND', 'x', 'f.ts'),
    (e: unknown) => e instanceof AnchorNotFoundError
  )
})

test('hasMarker：标记存在时返回 true', () => {
  // 注入时会在文件头部写一行标记注释，下次检测到标记就跳过
  assert.equal(hasMarker('// EP_INJECTED\nfoo', '// EP_INJECTED'), true)
})

test('hasMarker：标记不存在时返回 false', () => {
  assert.equal(hasMarker('foo bar', '// EP_INJECTED'), false)
})

test('幂等性：hasMarker 守卫防止重复注入', () => {
  // 模拟 overlay 被调用两次的场景：第一次注入成功后，第二次因为标记已存在而跳过
  const marker = '// MARKER'
  let src = 'const app = createApp(App)\napp.mount("#app")'

  // 第一次：没有标记，执行注入
  if (!hasMarker(src, marker)) {
    src = `${marker}\n` + insertAfter(src, 'const app = createApp(App)', `\napp.use(X)`)
  }
  const afterFirstInject = src

  // 第二次：已有标记，跳过注入，文件内容不变
  if (!hasMarker(src, marker)) {
    src = insertAfter(src, 'const app = createApp(App)', `\napp.use(X)`)
  }
  assert.equal(src, afterFirstInject, '第二次调用后文件内容应与第一次完全相同')
})
