import process from 'node:process'

/** @type {Partial<import('typedoc').TypeDocOptions>} */
const config = {
  entryPoints: ['./packages/core/src/index.ts'],
  out: 'docs',
  hostedBaseUrl: process.env.VITE_DOCS_URL,
  useHostedBaseUrlForAbsoluteLinks: true,
}

export default config
