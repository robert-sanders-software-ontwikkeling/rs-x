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
const esModules = ['rxjs', 'resize-observer-polyfill', 'superjson'].join('|');

// ------------------------------
// Jest configuration
// ------------------------------
const jestConfig: Config.InitialOptions = {
  // Environment
  testEnvironment: 'jest-environment-jsdom',
  extensionsToTreatAsEsm: ['.ts'],

  // 🚫 Exclude Angular package entirely
  testPathIgnorePatterns: [
    '<rootDir>/rs-x-angular/',
  ],

  modulePathIgnorePatterns: [
    '<rootDir>/rs-x-angular/',
  ],

  // Transforms
  transform: {
    // TypeScript via ts-jest (ESM)
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
        diagnostics: true,
        useESM: true,
        isolatedModules: false,
      },
    ],

    // ESM dependencies via Babel
    [`(${esModules}).+\\.js$`]: [
      'babel-jest',
      { configFile: '<rootDir>/babel.config.js' },
    ],

    // Styles / templates
    '^.+\\.(scss|css|html)$': 'jest-transform-stub',
  },

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
  moduleNameMapper: pathsToModuleNameMapper(
    compilerOptions.paths ?? {},
  ),
};

export default jestConfig;