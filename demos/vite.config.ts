import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  root: 'demo', // The folder that contains index.html
  plugins: [
    tsconfigPaths(), // This reads your tsconfig.json paths automatically
  ],
  server: {
    port: 5173, // or any port you like
    open: true, // auto open in browser
  },
  build: {
    outDir: '../dist', // where production build will go
  },
});