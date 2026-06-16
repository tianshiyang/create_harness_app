import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fse from 'fs-extra'
import { execa } from 'execa'
import { copyDir } from '../utils/fs.ts'
import type { MergeAdditions } from '../merge-json.ts'

const TEMPLATES_DIR = fileURLToPath(new URL('../templates', import.meta.url))

export const OPENSPEC_PKG: MergeAdditions = {
  devDependencies: {
    '@fission-ai/openspec': '^1.4.1',
  },
  scripts: {
    'openspec:validate': 'openspec validate --all --no-interactive',
    'openspec:list': 'openspec list',
  },
}

/**
 * 集成 OpenSpec：
 * 1. 用官方 CLI 非交互初始化（仅配置 Claude），生成 openspec/ + .claude/commands/opsx + .claude/skills/openspec-*
 * 2. openspec init 会往 .claude/skills/ 注入 5 个 skill。当项目带 harness 时，必须重算 skills-lock.json，
 *    否则 harness:check 会因 lock 条目与目录不一致而失败。verify-skills.mjs 是纯 Node 脚本，无需先 pnpm install。
 *    harness=none 时没有该脚本，跳过重算。
 * 3. 拷贝 OpenSpec 说明文档到项目 docs/
 */
export async function overlayOpenSpec(projectRoot: string): Promise<void> {
  await execa('npx', ['--yes', '@fission-ai/openspec@latest', 'init', '--tools', 'claude'], {
    cwd: projectRoot,
    stdio: 'inherit',
  })

  const verifyScript = path.join(projectRoot, 'scripts/verify-skills.mjs')
  if (await fse.pathExists(verifyScript)) {
    await execa('node', ['scripts/verify-skills.mjs', '--write'], { cwd: projectRoot })
  }

  await copyDir(path.join(TEMPLATES_DIR, 'openspec'), projectRoot)
}

