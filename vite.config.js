/// <reference types="vitest" />
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: ['./tsconfig.test.json'], // Use test-specific config for path resolution
    }),
    dts({
      rollupTypes: false,      // Keep per-file declarations for better IDE "Go to Definition"
      declarationMap: true,    // Enable .d.ts.map files
      insertTypesEntry: true,  // Auto-add types entry
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/app/**', 'src/test/**'],
    }),
  ],
  test: {
    environment: 'happy-dom',
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'EzWebAudio',
      formats: ['es'],         // ESM-only per CONTEXT decision
      fileName: 'index',       // Produces index.js
    },
    sourcemap: true,           // External source maps
    minify: false,             // Don't minify - consumers handle this
    rollupOptions: {
      external: [],            // No dependencies to externalize
    },
  },
})
