import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  outDir: 'dist',
  banner: { js: '#!/usr/bin/env node' },
  outExtension: () => ({ js: '.mjs' }),
  platform: 'node',
})
