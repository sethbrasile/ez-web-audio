/// <reference types="vitest" />
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: ['./tsconfig.test.json'], // Use test-specific config for path resolution
    }),
    dts({
      rollupTypes: true, // Bundle all declarations into a single file (fixes moduleResolution: nodenext)
      declarationMap: true, // Enable .d.ts.map files (still works with rollupTypes)
      insertTypesEntry: true, // Auto-add types entry
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/test/**'],
    }),
  ],
  test: {
    environment: 'happy-dom',
    exclude: ['e2e/**', 'node_modules/**'],
    setupFiles: ['src/test/setup.ts'],
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'EzWebAudio',
      formats: ['es'], // ESM-only per CONTEXT decision
    },
    sourcemap: true, // External source maps
    minify: false, // Don't minify - consumers handle this
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/index.ts'),
      },
      external: [], // No dependencies to externalize
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
  },
})
