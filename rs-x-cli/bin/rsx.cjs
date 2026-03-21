#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const CLI_VERSION = '0.2.0';
const VS_CODE_EXTENSION_ID = 'rs-x.rs-x-vscode-extension';
const RUNTIME_PACKAGES = [
  '@rs-x/core',
  '@rs-x/state-manager',
  '@rs-x/expression-parser',
];
const COMPILER_PACKAGES = ['@rs-x/compiler', '@rs-x/typescript-plugin'];

function parseArgs(argv) {
  const raw = argv.slice(2);
  const positionals = [];
  const flags = {};

  for (let index = 0; index < raw.length; index += 1) {
    const token = raw[index];
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }

    const key = token.slice(2);
    const next = raw[index + 1];
    if (next && !next.startsWith('--')) {
      flags[key] = next;
      index += 1;
      continue;
    }

    flags[key] = true;
  }

  return { positionals, flags };
}

function run(command, args, options = {}) {
  const { dryRun, cwd = process.cwd() } = options;
  const printable = [command, ...args].join(' ');

  if (dryRun) {
    logInfo(`[dry-run] ${printable}`);
    return { status: 0 };
  }

  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }

  return result;
}

function runCapture(command, args) {
  return spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function hasCommand(command) {
  const result = runCapture(command, ['--version']);
  return !result.error && result.status === 0;
}

function detectPackageManager(explicitPm) {
  if (explicitPm) {
    return explicitPm;
  }

  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (fs.existsSync(path.join(cwd, 'package-lock.json'))) {
    return 'npm';
  }
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) {
    return 'yarn';
  }
  if (fs.existsSync(path.join(cwd, 'bun.lockb'))) {
    return 'bun';
  }

  return 'npm';
}

function installPackages(pm, packages, options = {}) {
  const { dev = false, dryRun = false, label = 'packages' } = options;
  const argsByPm = {
    pnpm: dev ? ['add', '-D', ...packages] : ['add', ...packages],
    npm: dev
      ? ['install', '--save-dev', ...packages]
      : ['install', '--save', ...packages],
    yarn: dev ? ['add', '--dev', ...packages] : ['add', ...packages],
    bun: dev ? ['add', '--dev', ...packages] : ['add', ...packages],
  };

  const installArgs = argsByPm[pm];
  if (!installArgs) {
    logError(`Unsupported package manager: ${pm}`);
    process.exit(1);
  }

  logInfo(`Installing ${label} with ${pm}...`);
  run(pm, installArgs, { dryRun });
  logOk(`Installed ${label}.`);
}

function installRuntimePackages(pm, dryRun) {
  installPackages(pm, RUNTIME_PACKAGES, {
    dev: false,
    dryRun,
    label: 'runtime RS-X packages',
  });
}

function installCompilerPackages(pm, dryRun) {
  installPackages(pm, COMPILER_PACKAGES, {
    dev: true,
    dryRun,
    label: 'compiler tooling',
  });
}

function installVsCodeExtension(flags) {
  const dryRun = Boolean(flags['dry-run']);
  const force = Boolean(flags.force);
  const local = Boolean(flags.local);

  if (!hasCommand('code')) {
    logWarn('VS Code CLI `code` is not available on PATH. Skipping VS Code extension installation.');
    logInfo('In VS Code: Command Palette -> "Shell Command: Install code command in PATH".');
    return;
  }

  if (local) {
    installLocalVsix(dryRun, force);
    return;
  }

  const args = ['--install-extension', VS_CODE_EXTENSION_ID];
  if (force) {
    args.push('--force');
  }

  logInfo(`Installing ${VS_CODE_EXTENSION_ID} from VS Code marketplace...`);
  run('code', args, { dryRun });
  logOk('VS Code extension installed.');
}

function installLocalVsix(dryRun, force) {
  const repoRoot = findRepoRoot(process.cwd());
  if (!repoRoot) {
    logWarn('Could not locate rs-x repository root for --local VSIX install.');
    return;
  }

  const extensionDir = path.join(repoRoot, 'rs-x-vscode-extension');
  const extensionPackagePath = path.join(extensionDir, 'package.json');
  if (!fs.existsSync(extensionPackagePath)) {
    logWarn(`Missing ${extensionPackagePath}. Skipping local VSIX install.`);
    return;
  }

  const extensionPackage = JSON.parse(
    fs.readFileSync(extensionPackagePath, 'utf8'),
  );
  const vsixPath = path.join(
    extensionDir,
    `${extensionPackage.name}-${extensionPackage.version}.vsix`,
  );

  logInfo('Packaging local rs-x-vscode-extension...');
  run('pnpm', ['--filter', 'rs-x-vscode-extension', 'run', 'package'], {
    dryRun,
    cwd: repoRoot,
  });

  if (!dryRun && !fs.existsSync(vsixPath)) {
    logWarn(`Expected VSIX not found at ${vsixPath}. Skipping installation.`);
    return;
  }

  const args = ['--install-extension', vsixPath];
  if (force) {
    args.push('--force');
  }

  logInfo(`Installing local VSIX from ${vsixPath}...`);
  run('code', args, { dryRun });
  logOk('Local VS Code extension installed.');
}

function findRepoRoot(startDir) {
  let current = startDir;
  const root = path.parse(startDir).root;

  while (current !== root) {
    const marker = path.join(current, 'pnpm-workspace.yaml');
    const extensionDir = path.join(current, 'rs-x-vscode-extension');
    if (fs.existsSync(marker) && fs.existsSync(extensionDir)) {
      return current;
    }

    current = path.dirname(current);
  }

  return null;
}

function runDoctor() {
  const nodeMajor = Number.parseInt(process.versions.node.split('.')[0], 10);
  const hasCode = hasCommand('code');
  const checks = [
    {
      name: 'Node.js >= 20',
      ok: Number.isFinite(nodeMajor) && nodeMajor >= 20,
      details: `detected ${process.versions.node}`,
    },
    {
      name: 'VS Code CLI (code)',
      ok: hasCode,
      details: hasCode ? 'available' : 'not found in PATH',
    },
    {
      name: 'Package manager (pnpm/npm/yarn/bun)',
      ok:
        hasCommand('pnpm') ||
        hasCommand('npm') ||
        hasCommand('yarn') ||
        hasCommand('bun'),
      details: 'required for compiler package installation',
    },
  ];

  for (const check of checks) {
    const tag = check.ok ? '[OK]' : '[WARN]';
    console.log(`${tag} ${check.name} - ${check.details}`);
  }
}

function detectProjectContext(projectRoot) {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  let dependencies = {};

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    dependencies = {
      ...(packageJson.dependencies ?? {}),
      ...(packageJson.devDependencies ?? {}),
      ...(packageJson.peerDependencies ?? {}),
    };
  }

  if (
    fs.existsSync(path.join(projectRoot, 'angular.json')) ||
    Object.prototype.hasOwnProperty.call(dependencies, '@angular/core')
  ) {
    return 'angular';
  }

  if (Object.prototype.hasOwnProperty.call(dependencies, 'next')) {
    return 'next';
  }

  if (Object.prototype.hasOwnProperty.call(dependencies, 'react')) {
    return 'react';
  }

  return 'generic';
}

function resolveEntryFile(projectRoot, context, explicitEntry) {
  if (explicitEntry) {
    const resolved = path.resolve(projectRoot, explicitEntry);
    return fs.existsSync(resolved) ? resolved : null;
  }

  const candidatesByContext = {
    angular: ['src/main.ts', 'src/main.js'],
    react: ['src/main.tsx', 'src/main.jsx', 'src/index.tsx', 'src/index.jsx'],
    next: ['app/layout.tsx', 'app/layout.jsx', 'pages/_app.tsx', 'pages/_app.jsx'],
    generic: [
      'src/main.ts',
      'src/main.js',
      'src/index.ts',
      'src/index.js',
      'main.ts',
      'main.js',
      'index.ts',
      'index.js',
    ],
  };

  const candidates = candidatesByContext[context] ?? candidatesByContext.generic;
  for (const candidate of candidates) {
    const fullPath = path.join(projectRoot, candidate);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

function inferContextFromEntryFile(entryFile) {
  if (!entryFile || !fs.existsSync(entryFile)) {
    return null;
  }

  const normalizedPath = entryFile.replace(/\\/gu, '/');
  if (
    /\/app\/layout\.[jt]sx?$/u.test(normalizedPath) ||
    /\/pages\/_app\.[jt]sx?$/u.test(normalizedPath)
  ) {
    return 'next';
  }

  const content = fs.readFileSync(entryFile, 'utf8');
  if (
    content.includes('bootstrapApplication(') ||
    content.includes('platformBrowserDynamic()')
  ) {
    return 'angular';
  }
  if (
    content.includes('createRoot(') ||
    content.includes('ReactDOM.render(')
  ) {
    return 'react';
  }
  if (
    content.includes("from 'next/") ||
    content.includes('from "next/')
  ) {
    return 'next';
  }

  return 'generic';
}

function rsxBootstrapFilePath(entryFile) {
  const ext = path.extname(entryFile).toLowerCase();
  const fileName = ext === '.js' || ext === '.jsx' ? 'rsx-bootstrap.js' : 'rsx-bootstrap.ts';
  return path.join(path.dirname(entryFile), fileName);
}

function ensureRsxBootstrapFile(bootstrapFile, dryRun) {
  const content = `import { InjectionContainer } from '@rs-x/core';\nimport { RsXExpressionParserModule } from '@rs-x/expression-parser';\n\n// Generated by rsx init\nexport async function initRsx(): Promise<void> {\n  await InjectionContainer.load(RsXExpressionParserModule);\n}\n`;

  if (fs.existsSync(bootstrapFile)) {
    const existing = fs.readFileSync(bootstrapFile, 'utf8');
    if (existing.includes('export async function initRsx')) {
      logInfo(`Bootstrap module already exists: ${bootstrapFile}`);
      return;
    }

    logWarn(`Bootstrap file exists but is unmanaged: ${bootstrapFile}`);
    logWarn('Skipping overwrite; please add `initRsx` manually.');
    return;
  }

  if (dryRun) {
    logInfo(`[dry-run] create ${bootstrapFile}`);
    return;
  }

  fs.writeFileSync(bootstrapFile, content, 'utf8');
  logOk(`Created ${bootstrapFile}`);
}

function stripFileExtension(filePath) {
  return filePath.replace(/\.[^.]+$/u, '');
}

function toModuleImportPath(fromFile, targetFile) {
  const relative = path.relative(path.dirname(fromFile), targetFile).replace(/\\/gu, '/');
  const withDot = relative.startsWith('.') ? relative : `./${relative}`;
  return stripFileExtension(withDot);
}

function injectImport(source, importStatement) {
  if (source.includes(importStatement)) {
    return source;
  }

  const lines = source.split('\n');
  let insertAt = 0;

  while (insertAt < lines.length && lines[insertAt].trim().startsWith('import ')) {
    insertAt += 1;
  }

  const next = [...lines.slice(0, insertAt), importStatement, ...lines.slice(insertAt)];
  return next.join('\n');
}

function indentBlock(text, spaces) {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => `${pad}${line}`)
    .join('\n');
}

function wrapReactEntry(source) {
  const reactStartPattern = /(ReactDOM\s*\.\s*)?createRoot\([\s\S]*?\)\s*\.\s*render\([\s\S]*?\);/mu;
  const match = source.match(reactStartPattern);
  if (!match) {
    return null;
  }

  const renderCall = match[0].trim();
  const replacement = `const __rsxStart = async () => {\n  await initRsx();\n${indentBlock(renderCall, 2)}\n};\n\nvoid __rsxStart();`;
  return source.replace(reactStartPattern, replacement);
}

function wrapAngularEntry(source) {
  const angularBootstrapPattern = /bootstrapApplication\([\s\S]*?\)(?:\s*\.\s*catch\([\s\S]*?\))?\s*;/mu;
  const angularModulePattern = /platformBrowserDynamic\(\)\s*\.\s*bootstrapModule\([\s\S]*?\)(?:\s*\.\s*catch\([\s\S]*?\))?\s*;/mu;

  const match = source.match(angularBootstrapPattern) ?? source.match(angularModulePattern);
  if (!match) {
    return null;
  }

  const bootstrapCall = match[0].trim();
  const replacement = `const __rsxBootstrap = async () => {\n  await initRsx();\n${indentBlock(bootstrapCall, 2)}\n};\n\nvoid __rsxBootstrap();`;

  const pattern = source.match(angularBootstrapPattern)
    ? angularBootstrapPattern
    : angularModulePattern;
  return source.replace(pattern, replacement);
}

function wrapGenericEntry(source) {
  const startCallPattern = /^\s*([A-Za-z_$][\w$]*)\(\);\s*$/mu;
  const match = source.match(startCallPattern);
  if (!match) {
    return null;
  }

  const startCall = match[0].trim();
  const replacement = `const __rsxBootstrap = async () => {\n  await initRsx();\n${indentBlock(startCall, 2)}\n};\n\nvoid __rsxBootstrap();`;
  return source.replace(startCallPattern, replacement);
}

function nextGateFilePath(entryFile) {
  const ext = path.extname(entryFile).toLowerCase();
  const fileName = ext === '.js' || ext === '.jsx'
    ? 'rsx-bootstrap-gate.jsx'
    : 'rsx-bootstrap-gate.tsx';
  return path.join(path.dirname(entryFile), fileName);
}

function ensureNextGateFile(gateFile, bootstrapFile, dryRun) {
  const gateExt = path.extname(gateFile).toLowerCase();
  const useTypeScript = gateExt === '.tsx';
  const importPath = toModuleImportPath(gateFile, bootstrapFile);

  const content = useTypeScript
    ? `'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { initRsx } from '${importPath}';

// Generated by rsx init
export function RsxBootstrapGate(props: { children: ReactNode }): JSX.Element | null {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void initRsx().then(() => {
      if (active) {
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return null;
  }

  return <>{props.children}</>;
}
`
    : `'use client';

import { useEffect, useState } from 'react';

import { initRsx } from '${importPath}';

// Generated by rsx init
export function RsxBootstrapGate(props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void initRsx().then(() => {
      if (active) {
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return null;
  }

  return <>{props.children}</>;
}
`;

  if (fs.existsSync(gateFile)) {
    const existing = fs.readFileSync(gateFile, 'utf8');
    if (existing.includes('export function RsxBootstrapGate')) {
      logInfo(`Next gate module already exists: ${gateFile}`);
      return;
    }

    logWarn(`Next gate file exists but is unmanaged: ${gateFile}`);
    logWarn('Skipping overwrite; please add `RsxBootstrapGate` manually.');
    return;
  }

  if (dryRun) {
    logInfo(`[dry-run] create ${gateFile}`);
    return;
  }

  fs.writeFileSync(gateFile, content, 'utf8');
  logOk(`Created ${gateFile}`);
}

function patchNextLayoutEntry(source) {
  if (source.includes('<RsxBootstrapGate>')) {
    return source;
  }

  const bodyPattern = /<body([^>]*)>([\s\S]*?)<\/body>/u;
  const match = source.match(bodyPattern);
  if (!match) {
    return null;
  }

  const bodyAttributes = match[1] ?? '';
  const bodyInner = (match[2] ?? '').trim();
  const gateInner = bodyInner.length
    ? `\n${indentBlock(bodyInner, 10)}\n`
    : '\n';
  const replacement = `<body${bodyAttributes}>\n        <RsxBootstrapGate>${gateInner}        </RsxBootstrapGate>\n      </body>`;
  const updated = source.replace(bodyPattern, replacement);

  return updated;
}

function patchNextPagesAppEntry(source) {
  if (source.includes('<RsxBootstrapGate>')) {
    return source;
  }

  const componentRenderPattern = /<Component\b[^>]*\/>/u;
  const match = source.match(componentRenderPattern);
  if (!match) {
    return null;
  }

  const componentRender = match[0];
  const wrapped = `<RsxBootstrapGate>\n      ${componentRender}\n    </RsxBootstrapGate>`;
  return source.replace(componentRenderPattern, wrapped);
}

function patchNextEntryFile(entryFile, gateFile, dryRun) {
  const original = fs.readFileSync(entryFile, 'utf8');
  if (original.includes('RsxBootstrapGate') && original.includes('rsx-bootstrap-gate')) {
    logInfo(`Entry already wired for Next RS-X bootstrap gate: ${entryFile}`);
    return true;
  }

  const gateImportPath = toModuleImportPath(entryFile, gateFile);
  const importStatement = `import { RsxBootstrapGate } from '${gateImportPath}';`;
  const sourceWithImport = injectImport(original, importStatement);

  const normalizedPath = entryFile.replace(/\\/gu, '/');
  const isAppLayout = /\/app\/layout\.[jt]sx?$/u.test(normalizedPath);
  const isPagesApp = /\/pages\/_app\.[jt]sx?$/u.test(normalizedPath);

  let updated = null;
  if (isAppLayout) {
    updated = patchNextLayoutEntry(sourceWithImport);
    if (!updated) {
      logWarn(`Could not patch Next app router layout at ${entryFile}.`);
      return false;
    }
  } else if (isPagesApp) {
    updated = patchNextPagesAppEntry(sourceWithImport);
    if (!updated) {
      logWarn(`Could not patch Next pages router app file at ${entryFile}.`);
      return false;
    }
  } else {
    logWarn(`Unsupported Next entry file shape for ${entryFile}.`);
    return false;
  }

  if (dryRun) {
    logInfo(`[dry-run] patch ${entryFile}`);
    return true;
  }

  fs.writeFileSync(entryFile, updated, 'utf8');
  logOk(`Patched ${entryFile}`);
  return true;
}

function patchEntryFileForRsx(entryFile, bootstrapFile, context, dryRun) {
  const original = fs.readFileSync(entryFile, 'utf8');
  if (original.includes('initRsx') && original.includes('rsx-bootstrap')) {
    logInfo(`Entry already wired for RS-X bootstrap: ${entryFile}`);
    return true;
  }

  const importPath = toModuleImportPath(entryFile, bootstrapFile);
  const importStatement = `import { initRsx } from '${importPath}';`;

  let updated = injectImport(original, importStatement);

  if (context === 'react') {
    updated = wrapReactEntry(updated);
    if (!updated) {
      logWarn(`Could not find React app bootstrap call in ${entryFile}.`);
      return false;
    }
  } else if (context === 'angular') {
    updated = wrapAngularEntry(updated);
    if (!updated) {
      logWarn(`Could not find Angular bootstrap call in ${entryFile}.`);
      return false;
    }
  } else if (context === 'generic') {
    updated = wrapGenericEntry(updated);
    if (!updated) {
      logWarn(`Could not find a generic startup call (for example main();) in ${entryFile}.`);
      return false;
    }
  } else {
    logWarn(`Automatic bootstrap wiring is not yet supported for context '${context}'.`);
    return false;
  }

  if (dryRun) {
    logInfo(`[dry-run] patch ${entryFile}`);
    return true;
  }

  fs.writeFileSync(entryFile, updated, 'utf8');
  logOk(`Patched ${entryFile}`);
  return true;
}

function runInit(flags) {
  const dryRun = Boolean(flags['dry-run']);
  const skipVscode = Boolean(flags['skip-vscode']);
  const skipInstall = Boolean(flags['skip-install']);
  const pm = detectPackageManager(flags.pm);
  const projectRoot = process.cwd();

  if (!skipInstall) {
    installRuntimePackages(pm, dryRun);
    installCompilerPackages(pm, dryRun);
  } else {
    logInfo('Skipping package installation (--skip-install).');
  }

  const context = detectProjectContext(projectRoot);
  const entryFile = resolveEntryFile(projectRoot, context, flags.entry);
  const effectiveContext = flags.entry
    ? inferContextFromEntryFile(entryFile) ?? context
    : context;

  if (!entryFile) {
    logWarn('Could not detect an application entry file automatically.');
    logInfo('Use `rsx init --entry <path-to-entry-file>` to force bootstrap wiring.');
  } else if (effectiveContext === 'next') {
    logInfo(`Detected context: ${effectiveContext}`);
    logInfo(`Using entry file: ${entryFile}`);

    const bootstrapFile = rsxBootstrapFilePath(entryFile);
    const gateFile = nextGateFilePath(entryFile);

    ensureRsxBootstrapFile(bootstrapFile, dryRun);
    ensureNextGateFile(gateFile, bootstrapFile, dryRun);
    const patched = patchNextEntryFile(entryFile, gateFile, dryRun);

    if (!patched) {
      logInfo('Manual fallback snippet:');
      console.log("  import { RsxBootstrapGate } from './rsx-bootstrap-gate';");
      console.log('  // wrap app children with <RsxBootstrapGate>...</RsxBootstrapGate>');
    }
  } else {
    logInfo(`Detected context: ${effectiveContext}`);
    logInfo(`Using entry file: ${entryFile}`);

    const bootstrapFile = rsxBootstrapFilePath(entryFile);
    ensureRsxBootstrapFile(bootstrapFile, dryRun);
    const patched = patchEntryFileForRsx(
      entryFile,
      bootstrapFile,
      effectiveContext,
      dryRun,
    );

    if (!patched) {
      logInfo('Manual fallback snippet:');
      console.log("  import { initRsx } from './rsx-bootstrap';");
      console.log('  await initRsx(); // before first rsx(...)');
    }
  }

  if (!skipVscode) {
    installVsCodeExtension(flags);
  }

  logOk('RS-X init completed.');
}

function printHelp() {
  console.log(`rsx v${CLI_VERSION}`);
  console.log('');
  console.log('Commands:');
  console.log('  rsx doctor');
  console.log('  rsx install vscode [--force] [--local] [--dry-run]');
  console.log('  rsx install compiler [--pm <pnpm|npm|yarn|bun>] [--dry-run]');
  console.log('  rsx setup [--pm <pnpm|npm|yarn|bun>] [--force] [--local] [--dry-run]');
  console.log('  rsx init [--pm <pnpm|npm|yarn|bun>] [--entry <path>] [--skip-install] [--skip-vscode] [--force] [--local] [--dry-run]');
}

function logInfo(message) {
  console.log(`[INFO] ${message}`);
}

function logOk(message) {
  console.log(`[OK] ${message}`);
}

function logWarn(message) {
  console.warn(`[WARN] ${message}`);
}

function logError(message) {
  console.error(`[ERROR] ${message}`);
}

function main() {
  const { positionals, flags } = parseArgs(process.argv);
  const [command, target] = positionals;

  if (
    !command ||
    command === 'help' ||
    command === '--help' ||
    command === '-h'
  ) {
    printHelp();
    return;
  }

  if (command === '--version' || command === '-v' || command === 'version') {
    console.log(CLI_VERSION);
    return;
  }

  if (command === 'doctor') {
    runDoctor();
    return;
  }

  if (command === 'install' && target === 'vscode') {
    installVsCodeExtension(flags);
    return;
  }

  if (command === 'install' && target === 'compiler') {
    const pm = detectPackageManager(flags.pm);
    installCompilerPackages(pm, Boolean(flags['dry-run']));
    return;
  }

  if (command === 'setup') {
    const pm = detectPackageManager(flags.pm);
    installRuntimePackages(pm, Boolean(flags['dry-run']));
    installCompilerPackages(pm, Boolean(flags['dry-run']));
    installVsCodeExtension(flags);
    return;
  }

  if (command === 'init') {
    runInit(flags);
    return;
  }

  logError(`Unknown command: ${positionals.join(' ')}`);
  printHelp();
  process.exit(1);
}

main();
