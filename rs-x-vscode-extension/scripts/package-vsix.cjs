const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const extensionRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(extensionRoot, '..');
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
  fs.cpSync(sourcePath, targetPath, { recursive: true, dereference: true });
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

function copyWorkspacePackage(packageName, packageDirectory) {
  const sourceRoot = path.join(workspaceRoot, packageDirectory);
  const sourceManifestPath = path.join(sourceRoot, 'package.json');
  const sourceDistPath = path.join(sourceRoot, 'dist');

  if (!fs.existsSync(sourceManifestPath)) {
    throw new Error(
      `Workspace package manifest missing: ${sourceManifestPath}`,
    );
  }
  if (!fs.existsSync(sourceDistPath)) {
    throw new Error(`Workspace package dist missing: ${sourceDistPath}`);
  }

  const sourceManifest = JSON.parse(
    fs.readFileSync(sourceManifestPath, 'utf8'),
  );
  const targetRoot = path.join(
    stageRoot,
    'node_modules',
    ...packageName.split('/'),
  );

  copyRecursive(sourceDistPath, path.join(targetRoot, 'dist'));

  const packagedManifest = {
    name: sourceManifest.name,
    version: sourceManifest.version,
    type: sourceManifest.type,
    main: sourceManifest.main,
    module: sourceManifest.module,
    types: sourceManifest.types,
    exports: sourceManifest.exports,
  };

  fs.writeFileSync(
    path.join(targetRoot, 'package.json'),
    `${JSON.stringify(packagedManifest, null, 2)}\n`,
  );

  return sourceManifest.version;
}

function copyThirdPartyPackage(packageName) {
  const sourcePath = path.join(
    workspaceRoot,
    'node_modules',
    ...packageName.split('/'),
  );
  if (!fs.existsSync(sourcePath)) {
    throw new Error(
      `Required dependency missing from workspace node_modules: ${sourcePath}`,
    );
  }

  copyRecursive(
    sourcePath,
    path.join(stageRoot, 'node_modules', ...packageName.split('/')),
  );
}

if (!fs.existsSync(path.join(extensionRoot, 'dist', 'extension.js'))) {
  throw new Error(
    'Extension build output is missing. Run `pnpm run build` first.',
  );
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

copyRecursive(
  path.join(extensionRoot, 'dist', 'extension.js'),
  path.join(stageRoot, 'dist', 'extension.js'),
);
copyRecursive(
  path.join(extensionRoot, 'syntaxes'),
  path.join(stageRoot, 'syntaxes'),
);
copyRecursive(
  path.join(extensionRoot, 'schemas'),
  path.join(stageRoot, 'schemas'),
);
copyRecursive(
  path.join(extensionRoot, 'language-configuration.json'),
  path.join(stageRoot, 'language-configuration.json'),
);
copyRecursive(
  path.join(extensionRoot, 'README.md'),
  path.join(stageRoot, 'README.md'),
);
copyRecursive(
  path.join(extensionRoot, 'LICENSE'),
  path.join(stageRoot, 'LICENSE'),
);
copyRecursive(
  path.join(extensionRoot, 'icon.png'),
  path.join(stageRoot, 'icon.png'),
);
copyRecursive(
  path.join(extensionRoot, 'node_modules', '@rs-x', 'typescript-plugin'),
  path.join(stageRoot, 'node_modules', '@rs-x', 'typescript-plugin'),
);
copyRecursive(
  path.join(workspaceRoot, 'node_modules', 'typescript'),
  path.join(stageRoot, 'node_modules', 'typescript'),
);

const compilerVersion = copyWorkspacePackage('@rs-x/compiler', 'rs-x-compiler');
const expressionParserVersion = copyWorkspacePackage(
  '@rs-x/expression-parser',
  'rs-x-expression-parser',
);
const coreVersion = copyWorkspacePackage('@rs-x/core', 'rs-x-core');
const stateManagerVersion = copyWorkspacePackage(
  '@rs-x/state-manager',
  'rs-x-state-manager',
);

const thirdPartyPackageNames = [
  'astring',
  'meriyah',
  'rxjs',
  'tslib',
  'fast-equals',
  'inversify',
  'reflect-metadata',
  '@inversifyjs/common',
  '@inversifyjs/container',
  '@inversifyjs/core',
  '@inversifyjs/plugin',
  '@inversifyjs/prototype-utils',
  '@inversifyjs/reflect-metadata-utils',
];
for (const packageName of thirdPartyPackageNames) {
  copyThirdPartyPackage(packageName);
}

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
    '@rs-x/compiler': compilerVersion,
    '@rs-x/expression-parser': expressionParserVersion,
    '@rs-x/core': coreVersion,
    '@rs-x/state-manager': stateManagerVersion,
    astring: '1.9.0',
    meriyah: '7.1.0',
    rxjs: '7.8.2',
    tslib: '2.8.1',
    'fast-equals': '6.0.0',
    inversify: '8.1.0',
    'reflect-metadata': '0.2.2',
    '@inversifyjs/common': '2.0.1',
    '@inversifyjs/container': '2.0.1',
    '@inversifyjs/core': '10.0.1',
    '@inversifyjs/plugin': '0.3.1',
    '@inversifyjs/prototype-utils': '0.2.1',
    '@inversifyjs/reflect-metadata-utils': '1.5.0',
    typescript: baseManifest.dependencies.typescript,
  },
  files: [
    'dist',
    'schemas',
    'syntaxes',
    'language-configuration.json',
    'node_modules/@rs-x/typescript-plugin',
    'node_modules/@rs-x/compiler/dist',
    'node_modules/@rs-x/compiler/package.json',
    'node_modules/@rs-x/expression-parser/dist',
    'node_modules/@rs-x/expression-parser/package.json',
    'node_modules/@rs-x/core/dist',
    'node_modules/@rs-x/core/package.json',
    'node_modules/@rs-x/state-manager/dist',
    'node_modules/@rs-x/state-manager/package.json',
    'node_modules/typescript/lib',
    'node_modules/typescript/package.json',
    'node_modules/typescript/LICENSE.txt',
    'node_modules/typescript/README.md',
    'node_modules/typescript/SECURITY.md',
    'node_modules/typescript/ThirdPartyNoticeText.txt',
    'node_modules/astring',
    'node_modules/meriyah',
    'node_modules/rxjs',
    'node_modules/tslib',
    'node_modules/fast-equals',
    'node_modules/inversify',
    'node_modules/reflect-metadata',
    'node_modules/@inversifyjs/common',
    'node_modules/@inversifyjs/container',
    'node_modules/@inversifyjs/core',
    'node_modules/@inversifyjs/plugin',
    'node_modules/@inversifyjs/prototype-utils',
    'node_modules/@inversifyjs/reflect-metadata-utils',
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
