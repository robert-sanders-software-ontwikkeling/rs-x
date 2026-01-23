import type { Config } from '@jest/types';
import { pathsToModuleNameMapper } from 'ts-jest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// ------------------------------
// Load tsconfig dynamically
// ------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
const tsconfigPath = join(__dirname, 'tsconfig.test.json');
const tsconfigText = readFileSync(tsconfigPath, 'utf-8');
const { compilerOptions } = JSON.parse(tsconfigText);

// Adjust paths for ts-jest
Object.keys(compilerOptions.paths).forEach((alias) => {
  compilerOptions.paths[alias] = [`<rootDir>/${compilerOptions.paths[alias][0]}`];
});

// ESM dependencies that need Babel transform
const esModules = ['rxjs', 'resize-observer-polyfill', 'superjson'].join('|');

// ------------------------------
// Jest configuration
// ------------------------------
const jestConfig: Config.InitialOptions = {
  testEnvironment: 'jest-environment-jsdom',
  extensionsToTreatAsEsm: ['.ts'],

  transform: {
    // TypeScript with ts-jest
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
        diagnostics: true,
        useESM: true,
        isolatedModules: false,
      },
    ],

    // ESM dependencies with Babel
    [`(${esModules}).+\\.js$`]: [
      'babel-jest',
      { configFile: '<rootDir>/babel.config.js' },
    ],

    // SCSS / CSS / HTML stub transforms
    '^.+\\.(scss|css|html)$': 'jest-transform-stub',
  },

  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  cacheDirectory: '<rootDir>/dist/jest',
  reporters: ['default'],

  collectCoverage: true,
  coverageReporters: ['html'],

  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
  maxWorkers: '8',
  testTimeout: 10000,
  verbose: true,
};

export default jestConfig;