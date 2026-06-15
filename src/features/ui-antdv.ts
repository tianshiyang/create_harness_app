import path from 'node:path'
import { readText, writeText } from '../utils/fs.ts'
import { insertAfter, insertBefore, hasMarker } from '../inject.ts'
import type { MergeAdditions } from '../merge-json.ts'

const ANTDV_MARKER = '// ANT_DESIGN_VUE_INJECTED'

const VITE_IMPORTS = `import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
`
const VITE_PLUGINS = `
    Components({ resolvers: [AntDesignVueResolver()] }),`

const MAIN_IMPORTS = `import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
`

export const ANTDV_PKG: MergeAdditions = {
  dependencies: {
    'ant-design-vue': '^4.2.0',
    '@ant-design/icons-vue': '^7.0.0',
  },
  devDependencies: {
    'unplugin-vue-components': '^32.0.0',
  },
}

export async function overlayAntdv(projectRoot: string): Promise<void> {
  const mainPath = path.join(projectRoot, 'src/main.ts')
  let main = await readText(mainPath)
  if (!hasMarker(main, ANTDV_MARKER)) {
    main = insertBefore(main, 'import { createApp }', `${ANTDV_MARKER}\n${MAIN_IMPORTS}`, mainPath)
    main = insertAfter(main, 'const app = createApp(App)', `\napp.use(Antd)`, mainPath)
    await writeText(mainPath, main)
  }

  const vitePath = path.join(projectRoot, 'vite.config.ts')
  let vite = await readText(vitePath)
  if (!hasMarker(vite, ANTDV_MARKER)) {
    vite = insertBefore(vite, 'export default defineConfig(', `${ANTDV_MARKER}\n${VITE_IMPORTS}`, vitePath)
    vite = insertAfter(vite, 'plugins: [', VITE_PLUGINS, vitePath)
    await writeText(vitePath, vite)
  }
}
