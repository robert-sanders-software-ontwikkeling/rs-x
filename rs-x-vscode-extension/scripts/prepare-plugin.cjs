const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const extensionRoot = path.resolve(__dirname, '..');
const pluginRoot = path.resolve(extensionRoot, '..', 'rs-x-typescript-plugin');
const sourceEntry = path.join(pluginRoot, 'lib', 'index.ts');
const sourcePackageJson = path.join(pluginRoot, 'package.json');
const targetPackageRoot = path.join(
  extensionRoot,
  'node_modules',
  '@rs-x',
  'typescript-plugin',
);
const targetDistDir = path.join(targetPackageRoot, 'dist');
const targetEntry = path.join(targetDistDir, 'index.js');
const workspaceRoot = path.resolve(extensionRoot, '..');

const workspacePackageEntries = new Map([
  ['@rs-x/compiler', path.join(workspaceRoot, 'rs-x-compiler', 'lib', 'index.ts')],
  [
    '@rs-x/expression-parser',
    path.join(workspaceRoot, 'rs-x-expression-parser', 'lib', 'index.ts'),
  ],
  ['@rs-x/core', path.join(workspaceRoot, 'rs-x-core', 'lib', 'index.ts')],
  [
    '@rs-x/state-manager',
    path.join(workspaceRoot, 'rs-x-state-manager', 'lib', 'index.ts'),
  ],
]);

if (!fs.existsSync(sourceEntry)) {
  throw new Error(`Plugin source entry does not exist: ${sourceEntry}`);
}
if (!fs.existsSync(sourcePackageJson)) {
  throw new Error(`Plugin manifest does not exist: ${sourcePackageJson}`);
}

async function main() {
  fs.rmSync(targetPackageRoot, { recursive: true, force: true });
  fs.mkdirSync(targetDistDir, { recursive: true });

  await esbuild.build({
    entryPoints: [sourceEntry],
    outfile: targetEntry,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    minify: true,
    external: ['typescript'],
    plugins: [
      {
        name: 'rsx-workspace-alias',
        setup(build) {
          for (const [pkgName, entryPath] of workspacePackageEntries) {
            build.onResolve({ filter: new RegExp(`^${pkgName}$`) }, () => ({
              path: entryPath,
            }));
          }
        },
      },
    ],
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
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
