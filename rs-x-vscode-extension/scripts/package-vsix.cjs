const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const extensionRoot = path.resolve(__dirname, '..');
const stageRoot = path.join(extensionRoot, '.vsix-stage');
const baseManifest = JSON.parse(
  fs.readFileSync(path.join(extensionRoot, 'package.json'), 'utf8'),
);
const outputDir = path.join(extensionRoot, 'dist');
const outputPath = path.join(
  outputDir,
  `rs-x-vscode-extension-${baseManifest.version}.vsix`,
);
const vsceCliPath = require.resolve('@vscode/vsce/vsce');

function copyRecursive(sourcePath, targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.cpSync(sourcePath, targetPath, { recursive: true });
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    cwd: options.cwd ?? extensionRoot,
    env: options.env ?? process.env,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!fs.existsSync(path.join(extensionRoot, 'dist', 'extension.js'))) {
  throw new Error('Extension build output is missing. Run `pnpm run build` first.');
}
if (
  !fs.existsSync(
    path.join(
      extensionRoot,
      'node_modules',
      '@rs-x',
      'typescript-plugin',
      'dist',
      'index.js',
    ),
  )
) {
  throw new Error(
    'Bundled TypeScript plugin is missing. Run `pnpm run prepare:plugin` first.',
  );
}

fs.rmSync(stageRoot, { recursive: true, force: true });
fs.mkdirSync(stageRoot, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

copyRecursive(path.join(extensionRoot, 'dist'), path.join(stageRoot, 'dist'));
copyRecursive(path.join(extensionRoot, 'syntaxes'), path.join(stageRoot, 'syntaxes'));
copyRecursive(path.join(extensionRoot, 'README.md'), path.join(stageRoot, 'README.md'));
copyRecursive(path.join(extensionRoot, 'LICENSE'), path.join(stageRoot, 'LICENSE'));
copyRecursive(path.join(extensionRoot, 'icon.png'), path.join(stageRoot, 'icon.png'));
copyRecursive(
  path.join(
    extensionRoot,
    'node_modules',
    '@rs-x',
    'typescript-plugin',
  ),
  path.join(stageRoot, 'node_modules', '@rs-x', 'typescript-plugin'),
);

const stagedManifest = {
  name: baseManifest.name,
  displayName: baseManifest.displayName,
  description: baseManifest.description,
  icon: baseManifest.icon,
  version: baseManifest.version,
  publisher: baseManifest.publisher,
  engines: baseManifest.engines,
  categories: baseManifest.categories,
  activationEvents: baseManifest.activationEvents,
  main: baseManifest.main,
  contributes: baseManifest.contributes,
  dependencies: {
    '@rs-x/typescript-plugin': baseManifest.version,
  },
  files: [
    'dist',
    'syntaxes',
    'node_modules/@rs-x/typescript-plugin/dist',
    'node_modules/@rs-x/typescript-plugin/package.json',
    'icon.png',
    'package.json',
    'README.md',
    'LICENSE',
  ],
};

fs.writeFileSync(
  path.join(stageRoot, 'package.json'),
  `${JSON.stringify(stagedManifest, null, 2)}\n`,
);

run(
  process.execPath,
  [vsceCliPath, 'package', '--allow-missing-repository', '--out', outputPath],
  { cwd: stageRoot },
);

console.log(`VSIX generated at ${outputPath}`);
