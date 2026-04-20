const tsParser = require('@typescript-eslint/parser');
const globals = require('globals');
const vuePlugin = require('eslint-plugin-vue');
const vueParser = require('vue-eslint-parser');

const rootConfig = require('../eslint.config.cjs');

const vueRecommended = vuePlugin.configs?.['flat/recommended'];
const vueRecommendedRules = Array.isArray(vueRecommended)
  ? vueRecommended.reduce(
      (acc, entry) => Object.assign(acc, entry.rules ?? {}),
      {},
    )
  : (vueRecommended?.rules ?? {});

module.exports = [
  ...rootConfig,
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        project: ['./tsconfig.json'],
        tsconfigRootDir: process.cwd(),
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
      globals: globals.browser,
    },
    plugins: {
      vue: vuePlugin,
    },
    rules: {
      ...vueRecommendedRules,
    },
  },
];
