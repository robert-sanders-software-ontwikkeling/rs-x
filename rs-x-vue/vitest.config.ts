import vue from '@vitejs/plugin-vue';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue(), tsconfigPaths()],
  resolve: {
    alias: {
      '@rs-x/core': path.resolve(__dirname, '../rs-x-core/lib'),
      '@rs-x/state-manager': path.resolve(
        __dirname,
        '../rs-x-state-manager/lib',
      ),
      '@rs-x/expression-parser': path.resolve(
        __dirname,
        '../rs-x-expression-parser/lib',
      ),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
