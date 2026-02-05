import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      '@rs-x/core': path.resolve(__dirname, '../rs-x-core/lib'),
      '@rs-x/state-manager': path.resolve(__dirname, '../rs-x-state-manager/lib'),
      '@rs-x/expression-parser': path.resolve(__dirname, '../rs-x-expression-parser/lib')
    }
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'), // main entry
      name: 'RsxReact',
      fileName: 'index',
      formats: ['es']
    },
    sourcemap: true,
    emptyOutDir: true,
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: [
      "src/__tests__/**/*.test.ts",
      "src/__tests__/**/*.test.tsx",
      "src/__tests__/**/*.e2e.test.ts",
      "src/__tests__/**/*.e2e.test.tsx"
    ],
    exclude: ["node_modules", "dist"]
  }
});