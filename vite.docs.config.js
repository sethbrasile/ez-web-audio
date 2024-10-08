import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import prismjs from 'vite-plugin-prismjs'

export default defineConfig({
  base: '/ez-web-audio',
  plugins: [
    tsconfigPaths(),
    prismjs({
      languages: ['typescript', 'html'],
      plugins: ['line-numbers'],
      theme: 'tomorrow',
      css: true,
    }),
  ],
  publicDir: './src/app/public',
  build: {
    outDir: 'dist-app',
  },
  server: {
    proxy: {
      '/ez-web-audio/docs': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/docs/, ''),
      },
    },
  },
})
