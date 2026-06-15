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
