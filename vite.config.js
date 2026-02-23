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
      rollupTypes: false, // Keep per-file declarations for better IDE "Go to Definition"
      declarationMap: true, // Enable .d.ts.map files
      insertTypesEntry: true, // Auto-add types entry
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/app/**', 'src/test/**'],
    }),
  ],
  test: {
    environment: 'happy-dom',
    exclude: ['e2e/**', 'node_modules/**'],
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
      // Add barrel files as explicit inputs so they are not tree-shaken away
      input: {
        'index': resolve(__dirname, 'src/index.ts'),
        'effects/index': resolve(__dirname, 'src/effects/index.ts'),
        'errors/index': resolve(__dirname, 'src/errors/index.ts'),
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
