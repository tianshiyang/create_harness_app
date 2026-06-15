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
