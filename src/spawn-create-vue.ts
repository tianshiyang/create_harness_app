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
