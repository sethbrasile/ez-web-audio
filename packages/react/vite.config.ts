/// <reference types="vitest" />
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      rollupTypes: true, // Bundle all declarations into a single file (fixes moduleResolution: nodenext)
      declarationMap: true, // Enable .d.ts.map files (still works with rollupTypes)
      insertTypesEntry: true, // Auto-add types entry
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    }),
  ],
  test: {
    environment: 'happy-dom',
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'EzWebAudioReact',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    sourcemap: true,
    minify: false,
    rollupOptions: {
      external: ['react', 'react/jsx-runtime', 'ez-web-audio'],
    },
  },
})
