import js from '@eslint/js';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'ref/**', 'mockups/**', 'shots/**', 'server/data/**'] },
  js.configs.recommended,
  {
    files: ['server/**/*.js', 'scripts/**/*.mjs', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { process: 'readonly', console: 'readonly', Buffer: 'readonly',
        setTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly',
        fetch: 'readonly', AbortSignal: 'readonly', URLSearchParams: 'readonly',
        WebSocket: 'readonly' },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-console': 'off',
    },
  },
  {
    files: ['public/js/**/*.js', 'admin/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        window: 'readonly', document: 'readonly', location: 'readonly', history: 'readonly',
        navigator: 'readonly', localStorage: 'readonly', fetch: 'readonly',
        setTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly',
        requestAnimationFrame: 'readonly', performance: 'readonly', console: 'readonly',
        CustomEvent: 'readonly', FormData: 'readonly', IntersectionObserver: 'readonly',
        Node: 'readonly', CSS: 'readonly', URLSearchParams: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
];
