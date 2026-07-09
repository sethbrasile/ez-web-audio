/// <reference types="vitest" />
import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    vue(),
    dts({
      rollupTypes: true, // Bundle all declarations into a single file (fixes moduleResolution: nodenext)
      declarationMap: true, // Enable .d.ts.map files (still works with rollupTypes)
      insertTypesEntry: true, // Auto-add types entry
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    }),
  ],
  test: {
    environment: 'happy-dom',
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'EzWebAudioVue',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    sourcemap: true,
    minify: false,
    rollupOptions: {
      external: ['vue', 'ez-web-audio'],
    },
  },
})
