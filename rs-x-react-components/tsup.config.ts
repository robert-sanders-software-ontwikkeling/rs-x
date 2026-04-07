import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  external: [/^react/, /^rxjs/, 'next'],
  tsconfig: 'tsconfig.build.json',
  env: { TSUP_DISABLE_SWC: '1' },
});
