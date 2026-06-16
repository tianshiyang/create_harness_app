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

    // harness 的 check 脚本会调用 pnpm format:check，但 create-vue 只生成 format（--write）。
    // 从现有 format 脚本派生 format:check（--write → --check），与 create-vue 的 prettier 参数保持一致。
    const existingScripts = (pkg.scripts ?? {}) as Record<string, string>
    if (existingScripts.format?.includes('--write') && !existingScripts['format:check']) {
      add.scripts!['format:check'] = existingScripts.format.replace('--write', '--check')
    }
  }

  pkg = mergePackageJson(pkg, add)
  await writeJson(pkgPath, pkg)
}
