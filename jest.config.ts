import type { Config } from '@jest/types';
import { pathsToModuleNameMapper } from 'ts-jest';
import { compilerOptions } from './tsconfig.json';

Object.keys(compilerOptions.paths).forEach((alias) => {
  compilerOptions.paths[alias] = [
    `<rootDir>/${compilerOptions.paths[alias][0]}`,
  ];
});

const esModules = ['rxjs', 'resize-observer-polyfill', 'superjson'].join('|');

const jestConfig: Config.InitialOptions = {
  testEnvironment: 'jsdom',

  extensionsToTreatAsEsm: ['.ts'],

  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
        diagnostics: true,
        useESM: true,
        isolatedModules: false,
      },
    ],
    [`(${esModules}).+\\.js$`]: 'babel-jest',
    '^.+\\.scss$': 'jest-scss-transform',
    '^.+\\.html?$': 'html-loader-jest',
  },

  setupFiles: ['fake-indexeddb/auto'],
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