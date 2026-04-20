import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: repoRoot,
    resolveAlias: {
      '@rs-x/angular': './rs-x-angular/dist/rsx/fesm2022/rs-x-angular.mjs',
    },
  },
};

export default nextConfig;
