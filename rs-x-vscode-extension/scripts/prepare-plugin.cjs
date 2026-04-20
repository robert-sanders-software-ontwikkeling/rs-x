const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const extensionRoot = path.resolve(__dirname, '..');
const pluginRoot = path.resolve(extensionRoot, '..', 'rs-x-typescript-plugin');
const sourceEntry = path.join(pluginRoot, 'dist', 'index.js');
const sourcePackageJson = path.join(pluginRoot, 'package.json');
const targetPackageRoot = path.join(
  extensionRoot,
  'node_modules',
  '@rs-x',
  'typescript-plugin',
);
const targetDistDir = path.join(targetPackageRoot, 'dist');
const targetEntry = path.join(targetDistDir, 'index.js');

if (!fs.existsSync(sourceEntry)) {
  throw new Error(`Plugin dist does not exist: ${sourceEntry}`);
}
if (!fs.existsSync(sourcePackageJson)) {
  throw new Error(`Plugin manifest does not exist: ${sourcePackageJson}`);
}

fs.rmSync(targetPackageRoot, { recursive: true, force: true });
fs.mkdirSync(targetDistDir, { recursive: true });

esbuild.buildSync({
  entryPoints: [sourceEntry],
  outfile: targetEntry,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  minify: true,
  external: ['typescript'],
});

const pluginManifest = JSON.parse(fs.readFileSync(sourcePackageJson, 'utf8'));
const packagedManifest = {
  name: pluginManifest.name,
  version: pluginManifest.version,
  main: './dist/index.js',
};
fs.writeFileSync(
  path.join(targetPackageRoot, 'package.json'),
  JSON.stringify(packagedManifest, null, 2),
);
