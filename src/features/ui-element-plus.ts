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
