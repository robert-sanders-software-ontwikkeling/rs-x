import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type Config } from '@jest/types';
import { pathsToModuleNameMapper } from 'ts-jest';

// ------------------------------
// Load tsconfig dynamically
// ------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
const tsconfigPath = join(__dirname, 'tsconfig.test.json');
const tsconfigText = readFileSync(tsconfigPath, 'utf-8');
const { compilerOptions } = JSON.parse(tsconfigText);

// Adjust paths for ts-jest
Object.keys(compilerOptions.paths ?? {}).forEach((alias) => {
  compilerOptions.paths[alias] = [
    `<rootDir>/${compilerOptions.paths[alias][0]}`,
  ];
});

// ESM dependencies that need Babel transform
const esModules = [
  'rxjs',
  'resize-observer-polyfill',
  'superjson',
  'inversify',
  '@inversifyjs/common',
  '@inversifyjs/container',
  '@inversifyjs/core',
  '@inversifyjs/plugin',
  '@inversifyjs/prototype-utils',
  '@inversifyjs/reflect-metadata-utils',
].join('|');
const includePerformanceTests =
  process.env.RSX_INCLUDE_PERFORMANCE_TESTS === 'true';

// ------------------------------
// Jest configuration
// ------------------------------
const jestConfig: Config.InitialOptions = {
  // Environment
  testEnvironment: 'jest-environment-jsdom',
  extensionsToTreatAsEsm: ['.ts'],

  // Exclude Angular and React package entirely
  testPathIgnorePatterns: [
    '<rootDir>/rs-x-angular/',
    '<rootDir>/rs-x-react/',
    '<rootDir>/rs-x-vue/',
    '<rootDir>/rs-x-cli/.tests/',
    '<rootDir>/rs-x-cli/rsx-project-',
    '<rootDir>/rs-x-vscode-extension/.vsix-stage/',
    ...(!includePerformanceTests
      ? ['<rootDir>/rs-x-expression-parser/tests/performance/']
      : []),
  ],

  modulePathIgnorePatterns: [
    '<rootDir>/rs-x-angular/',
    '<rootDir>/rs-x-react/',
    '<rootDir>/rs-x-vue/',
    '<rootDir>/rs-x-cli/.tests/',
    '<rootDir>/rs-x-cli/rsx-project-',
    '<rootDir>/rs-x-vscode-extension/.vsix-stage/',
  ],

  // Transforms
  transform: {
    // TypeScript and selected JavaScript via ts-jest (ESM)
    '^.+\\.[jt]sx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
        diagnostics: true,
        useESM: true,
        isolatedModules: false,
      },
    ],

    // Styles / templates
    '^.+\\.(scss|css|html)$': 'jest-transform-stub',
  },

  transformIgnorePatterns: [`/node_modules/(?!(${esModules})/)`],

  setupFiles: ['<rootDir>/jest.idb.setup.ts'],

  // Setup
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Performance / output
  cacheDirectory: '<rootDir>/dist/jest',
  reporters: ['default'],
  verbose: true,
  maxWorkers: '8',
  testTimeout: 10000,

  // Coverage
  collectCoverage: true,
  coverageReporters: ['html'],

  // Path aliases
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths ?? {}),
};

export default jestConfig;
