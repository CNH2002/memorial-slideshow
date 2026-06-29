import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  prettierConfig,
  {
    ignores: ['dist/**', 'node_modules/**', 'public/sw.js'],
  },
  {
    languageOptions: {
      globals: globals.browser, // tells ESLint that document, window, URL, etc. exist
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
];
