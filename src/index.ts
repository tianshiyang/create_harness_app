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
    config = {
      ...base,
      uiLibrary: args.uiLibrary ?? base.uiLibrary,
      harness:   args.harness   ?? base.harness,
      axios:     !args.noAxios,
      vitest:    args.vitest,
    }
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
