const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const importPlugin = require('eslint-plugin-import');
const simpleSort = require('eslint-plugin-simple-import-sort');
const globals = require('globals');

/**
 * ESLint Flat Config for TypeScript (ESLint 9)
 */
module.exports = [
  // Ignore compiled and declaration files
  {
    ignores: [
      '**/*.d.ts',
      '**/.next/**',
      '**/.tests/**',
      '**/out/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.tmp/**',
      '**/.tmp-*',
      '**/tmp-*.ts',
      '**/tmp-*.mjs',
      '**/*.generated.ts',
      'rs-x-cli/templates/**',
      // Test/mock/config files not included in package tsconfigs
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/tests/**',
      '**/testing/**',
      '**/vitest.config.ts',
      '**/tsup.config.ts',
      'jest.config.ts',
      'jest.*.ts',
      'custom-matchers.ts',
      'demo/**',
    ],
  },

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: process.cwd(),
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: globals.node,
    },

    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin,
      'simple-import-sort': simpleSort,
    },

    rules: {
      // --- Core TS hygiene ---
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-function': 'off',

      // --- Type-only imports ---
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],

      // --- Import hygiene ---
      'import/no-duplicates': 'error',

      // --- Sort imports ---
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // Node.js built-ins
            ['^node:'],
            // External packages
            ['^@?\\w'],
            // Internal packages (your @rs-x scope)
            ['^(@rs-x)(/.*|$)'],
            // Parent imports
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            // Relative imports
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
            // Style imports
            ['^.+\\.s?css$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
      semi: ['error', 'always'],
    },
  },
];
