import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { copyDir } from '../utils/fs.ts'
import type { MergeAdditions } from '../merge-json.ts'

const TEMPLATES_DIR = fileURLToPath(new URL('../templates', import.meta.url))

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
