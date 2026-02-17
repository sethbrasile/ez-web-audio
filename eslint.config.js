import antfu from '@antfu/eslint-config'

export default antfu(
  {
    ignores: [
      'src/app/public',
      '.planning/**',
      'docs/assets/**',
      'docs/public/audio/**',
      'playwright-report/**',
      'test-results/**',
    ],
    type: 'lib',
  },
  {
    // Relaxed rules for docs Vue components and markdown — will be addressed in Phase 22
    files: ['docs/**/*.vue', 'docs/**/*.md', 'docs/**/*.md/**', 'docs/.vitepress/**/*.mts'],
    rules: {
      'style/max-statements-per-line': 'off',
      'unused-imports/no-unused-vars': 'off',
      'antfu/no-top-level-await': 'off',
    },
  },
)
