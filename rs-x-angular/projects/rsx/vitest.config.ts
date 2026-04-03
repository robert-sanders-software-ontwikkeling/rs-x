import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: [path.resolve(__dirname, 'src/**/*.spec.ts')],
    setupFiles: [path.resolve(__dirname, 'setup-vitest.ts')],
  },
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json-summary'],
    include: [
      path.resolve(__dirname, 'src/lib/rsx.pipe.ts'),
      path.resolve(__dirname, 'src/lib/rsx.providers.ts'),
    ],
    exclude: [path.resolve(__dirname, 'src/**/*.spec.ts')],
    thresholds: {
      lines: 100,
      functions: 100,
      statements: 100,
      branches: 100,
    },
  },
  resolve: {
    alias: {
      '@rs-x/core': path.resolve(__dirname, '../../../rs-x-core/lib'),
      '@rs-x/state-manager': path.resolve(
        __dirname,
        '../../../rs-x-state-manager/lib',
      ),
      '@rs-x/expression-parser': path.resolve(
        __dirname,
        '../../../rs-x-expression-parser/lib',
      ),
    },
  },
});
