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
