import { defineConfig } from 'tsup';

const env = process.env.NODE_ENV || 'development';

export default defineConfig({
  entry: {
    'dev-tools': 'src/dev-tools.ts',
    'panel/panel.component': 'src/panel/panel.component.tsx',
    'proxies/page-proxy': 'src/proxies/page-proxy.ts',
  },
  bundle: true,           // explicitly bundle all dependencies
  format: ['iife'],       // single browser-friendly script
  globalName: 'RSX',      // optional global for your scripts
  splitting: false,       // Chrome DevTools panel cannot handle ESM splitting
  outDir: 'dist',
  sourcemap: true,
  minify: false,
  dts: false,
  clean: true,
  define: {
    'process.env.NODE_ENV': `"${env}"`, // <-- THIS MUST STAY
  },
  esbuildOptions(options) {
    options.platform = 'browser'; // force browser build
  },
});