import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), // <-- geen babel plugins nodig
  ],
  resolve: {
    alias: {
      '@rs-x/core': path.resolve(__dirname, '../rs-x-core/lib'),
      '@rs-x/state-manager': path.resolve(__dirname, '../rs-x-state-manager/lib'),
      '@rs-x/expression-parser': path.resolve(__dirname, '../rs-x-expression-parser/lib'),
      '@rs-x/react': path.resolve(__dirname, '../rs-x-react/src'),
    },
  },
});