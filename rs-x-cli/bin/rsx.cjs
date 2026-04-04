#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { spawnSync } = require('node:child_process');

const CLI_VERSION = (() => {
  try {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
})();
const VS_CODE_EXTENSION_ID = 'rs-x.rs-x-vscode-extension';
const ANGULAR_DEMO_TEMPLATE_DIR = path.join(
  __dirname,
  '..',
  'templates',
  'angular-demo',
);
const REACT_DEMO_TEMPLATE_DIR = path.join(
  __dirname,
  '..',
  'templates',
  'react-demo',
);
const NEXT_DEMO_TEMPLATE_DIR = path.join(
  __dirname,
  '..',
  'templates',
  'next-demo',
);
const RUNTIME_PACKAGES = [
  '@rs-x/core',
  '@rs-x/state-manager',
  '@rs-x/expression-parser',
];
const COMPILER_PACKAGES = ['@rs-x/compiler', '@rs-x/typescript-plugin'];
const RSX_PACKAGE_VERSION = '^1.0.2';
const PROJECT_TEMPLATES = ['angular', 'vuejs', 'react', 'nextjs', 'nodejs'];
const TS_RESERVED_WORDS = new Set([
  'abstract',
  'any',
  'as',
  'asserts',
  'async',
  'await',
  'bigint',
  'boolean',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'declare',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'from',
  'function',
  'get',
  'if',
  'implements',
  'import',
  'in',
  'infer',
  'instanceof',
  'interface',
  'is',
  'keyof',
  'let',
  'module',
  'namespace',
  'never',
  'new',
  'null',
  'number',
  'object',
  'of',
  'package',
  'private',
  'protected',
  'public',
  'readonly',
  'return',
  'satisfies',
  'set',
  'static',
  'string',
  'super',
  'switch',
  'symbol',
  'this',
  'throw',
  'true',
  'try',
  'type',
  'typeof',
  'undefined',
  'unique',
  'unknown',
  'var',
  'void',
  'while',
  'with',
  'yield',
]);

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

function applyTagToPackages(packages, tag) {
  return packages.map((pkg) => {
    const lastAt = pkg.lastIndexOf('@');
    const slashIndex = pkg.indexOf('/');
    const hasVersion = pkg.startsWith('@') ? lastAt > slashIndex : lastAt > 0;
    if (hasVersion) {
      return pkg;
    }
    return `${pkg}@${tag}`;
  });
}

function resolveInstallTag(flags) {
  if (parseBooleanFlag(flags.next, false)) {
    return 'next';
  }

  if (CLI_VERSION.includes('-')) {
    return 'next';
  }

  const checkoutRoot = findRepoRoot(__dirname);
  if (!checkoutRoot) {
    return undefined;
  }

  const branchResult = spawnSync('git', ['branch', '--show-current'], {
    cwd: checkoutRoot,
    encoding: 'utf8',
  });
  const branch = branchResult.status === 0 ? branchResult.stdout.trim() : '';
  if (branch && branch !== 'main') {
    return 'next';
  }

  return undefined;
}

function installPackages(pm, packages, options = {}) {
  const { dev = false, dryRun = false, label = 'packages', tag } = options;
  const resolvedPackages = tag ? applyTagToPackages(packages, tag) : packages;
  const argsByPm = {
    pnpm: dev
      ? ['add', '-D', ...resolvedPackages]
      : ['add', ...resolvedPackages],
    npm: dev
      ? ['install', '--save-dev', ...resolvedPackages]
      : ['install', '--save', ...resolvedPackages],
    yarn: dev
      ? ['add', '--dev', ...resolvedPackages]
      : ['add', ...resolvedPackages],
    bun: dev
      ? ['add', '--dev', ...resolvedPackages]
      : ['add', ...resolvedPackages],
  };

  const installArgs = argsByPm[pm];
  if (!installArgs) {
    logError(`Unsupported package manager: ${pm}`);
    process.exit(1);
  }

  const tagInfo = tag ? ` (tag: ${tag})` : '';
  logInfo(`Installing ${label} with ${pm}${tagInfo}...`);
  run(pm, installArgs, { dryRun });
  logOk(`Installed ${label}.`);
}

function installRuntimePackages(pm, dryRun, tag) {
  installPackages(pm, RUNTIME_PACKAGES, {
    dev: false,
    dryRun,
    tag,
    label: 'runtime RS-X packages',
  });
}

function installCompilerPackages(pm, dryRun, tag) {
  installPackages(pm, COMPILER_PACKAGES, {
    dev: true,
    dryRun,
    tag,
    label: 'compiler tooling',
  });
}

function installVsCodeExtension(flags) {
  const dryRun = Boolean(flags['dry-run']);
  const force = Boolean(flags.force);
  const local = Boolean(flags.local);

  if (!hasCommand('code')) {
    logWarn(
      'VS Code CLI `code` is not available on PATH. Skipping VS Code extension installation.',
    );
    logInfo(
      'In VS Code: Command Palette -> "Shell Command: Install code command in PATH".',
    );
    return;
  }

  if (local) {
    installLocalVsix(dryRun, force);
    return;
  }

  installBundledVsix(dryRun, force);
}

function resolveBundledVsix() {
  const packageRoot = path.resolve(__dirname, '..');
  const candidates = fs
    .readdirSync(packageRoot)
    .filter((name) => /^rs-x-vscode-extension-.*\.vsix$/u.test(name))
    .map((name) => path.join(packageRoot, name));

  if (candidates.length === 0) {
    return null;
  }

  const latest = candidates
    .map((fullPath) => ({
      fullPath,
      mtimeMs: fs.statSync(fullPath).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0];

  return latest?.fullPath ?? null;
}

function installBundledVsix(dryRun, force) {
  const bundledVsix = resolveBundledVsix();
  if (!bundledVsix) {
    logWarn(
      'No bundled VSIX found in @rs-x/cli. Skipping VS Code extension install.',
    );
    logInfo(
      'If you are developing in the rs-x repo, use `rsx install vscode --local` instead.',
    );
    return;
  }

  const args = ['--install-extension', bundledVsix];
  if (force) {
    args.push('--force');
  }

  logInfo(`Installing bundled VSIX from ${bundledVsix}...`);
  run('code', args, { dryRun });
  logOk('VS Code extension installed from bundled VSIX.');
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
  const vsixFileName = `${extensionPackage.name}-${extensionPackage.version}.vsix`;
  const preferredVsixPath = path.join(extensionDir, 'dist', vsixFileName);
  const legacyVsixPath = path.join(extensionDir, vsixFileName);

  logInfo('Packaging local rs-x-vscode-extension...');
  run('pnpm', ['--filter', 'rs-x-vscode-extension', 'run', 'package'], {
    dryRun,
    cwd: repoRoot,
  });

  const vsixPath =
    !dryRun && fs.existsSync(preferredVsixPath)
      ? preferredVsixPath
      : !dryRun && fs.existsSync(legacyVsixPath)
        ? legacyVsixPath
        : preferredVsixPath;

  if (!dryRun && !fs.existsSync(vsixPath)) {
    logWarn(
      `Expected VSIX not found at ${preferredVsixPath}. Skipping installation.`,
    );
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

function isValidTsIdentifier(input) {
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(input)) {
    return false;
  }

  return !TS_RESERVED_WORDS.has(input);
}

function toKebabCase(input) {
  return input
    .replace(/([a-z0-9])([A-Z])/gu, '$1-$2')
    .replace(/[_\s]+/gu, '-')
    .replace(/[^a-zA-Z0-9-]/gu, '-')
    .replace(/-+/gu, '-')
    .replace(/^-|-$/gu, '')
    .toLowerCase();
}

function ensureTsExtension(fileName) {
  if (/\.[cm]?[jt]sx?$/u.test(fileName)) {
    return fileName;
  }

  return `${fileName}.ts`;
}

async function askUntilNonEmpty(rl, prompt) {
  while (true) {
    const answer = (await rl.question(prompt)).trim();
    if (answer.length > 0) {
      return answer;
    }
    logWarn('Value is required.');
  }
}

async function askUntilValidIdentifier(rl) {
  while (true) {
    const answer = (
      await rl.question('Expression export name (TS identifier): ')
    ).trim();
    if (!answer) {
      logWarn('Name is required.');
      continue;
    }

    if (isValidTsIdentifier(answer)) {
      return answer;
    }

    logWarn(`"${answer}" is not a valid TypeScript identifier.`);
  }
}

function normalizeYesNo(answer, defaultValue) {
  const normalized = answer.trim().toLowerCase();
  if (!normalized) {
    return defaultValue;
  }

  if (normalized === 'y' || normalized === 'yes') {
    return true;
  }

  if (normalized === 'n' || normalized === 'no') {
    return false;
  }

  return defaultValue;
}

function stripTsLikeExtension(fileName) {
  return fileName.replace(/\.[cm]?[jt]sx?$/u, '');
}

function createModelTemplate() {
  return `export const model = {
  a: 1,
};
`;
}

function createExpressionTemplate(
  expressionName,
  modelImportPath,
  modelExportName,
) {
  return `import { rsx } from '@rs-x/expression-parser';
import { ${modelExportName} } from '${modelImportPath}';

export const ${expressionName} = rsx('a')(${modelExportName});
`;
}

async function askForIdentifierWithDefault(rl, prompt, defaultValue) {
  while (true) {
    const answer = (await rl.question(prompt)).trim();
    if (!answer) {
      return defaultValue;
    }

    if (isValidTsIdentifier(answer)) {
      return answer;
    }

    logWarn(`"${answer}" is not a valid TypeScript identifier.`);
  }
}

async function runAdd() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const expressionName = await askUntilValidIdentifier(rl);

    const kebabAnswer = await rl.question('Use kebab-case file name? [Y/n]: ');
    const useKebabCase = normalizeYesNo(kebabAnswer, true);

    const directoryInput = await askUntilNonEmpty(
      rl,
      'Directory path (relative or absolute): ',
    );
    const resolvedDirectory = path.isAbsolute(directoryInput)
      ? directoryInput
      : path.resolve(process.cwd(), directoryInput);

    const baseFileName = useKebabCase
      ? toKebabCase(expressionName)
      : expressionName;
    const expressionFileName = ensureTsExtension(baseFileName);
    const expressionFileBase = stripTsLikeExtension(expressionFileName);
    const modelFileName = `${expressionFileBase}.model.ts`;
    const expressionPath = path.join(resolvedDirectory, expressionFileName);
    const modelPath = path.join(resolvedDirectory, modelFileName);
    const useExistingModelAnswer = await rl.question(
      'Use existing model file? [y/N]: ',
    );
    const useExistingModel = normalizeYesNo(useExistingModelAnswer, false);

    if (
      fs.existsSync(expressionPath) ||
      (!useExistingModel && fs.existsSync(modelPath))
    ) {
      const overwriteAnswer = await rl.question(
        `One or more target files already exist. Overwrite? [y/N]: `,
      );
      const shouldOverwrite = normalizeYesNo(overwriteAnswer, false);
      if (!shouldOverwrite) {
        logInfo('Cancelled. Existing file was not modified.');
        return;
      }
    }

    fs.mkdirSync(resolvedDirectory, { recursive: true });
    let modelImportPath = `./${expressionFileBase}.model`;
    let modelExportName = 'model';

    if (useExistingModel) {
      const existingModelPathInput = await askUntilNonEmpty(
        rl,
        'Existing model file path (relative to output dir or absolute): ',
      );
      const resolvedExistingModelPath = path.isAbsolute(existingModelPathInput)
        ? existingModelPathInput
        : path.resolve(resolvedDirectory, existingModelPathInput);

      if (!fs.existsSync(resolvedExistingModelPath)) {
        logError(`Model file not found: ${resolvedExistingModelPath}`);
        return;
      }

      modelImportPath = toModuleImportPath(
        expressionPath,
        resolvedExistingModelPath,
      );
      modelExportName = await askForIdentifierWithDefault(
        rl,
        'Model export name [model]: ',
        'model',
      );
    } else {
      fs.writeFileSync(modelPath, createModelTemplate(), 'utf8');
      logOk(`Created ${modelPath}`);
    }

    fs.writeFileSync(
      expressionPath,
      createExpressionTemplate(
        expressionName,
        modelImportPath,
        modelExportName,
      ),
      'utf8',
    );

    logOk(`Created ${expressionPath}`);
  } finally {
    rl.close();
  }
}

function writeFileWithDryRun(filePath, content, dryRun) {
  if (dryRun) {
    logInfo(`[dry-run] create ${filePath}`);
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function copyPathWithDryRun(sourcePath, targetPath, dryRun) {
  if (dryRun) {
    logInfo(`[dry-run] copy ${sourcePath} -> ${targetPath}`);
    return;
  }

  const stat = fs.statSync(sourcePath);
  if (stat.isDirectory()) {
    fs.mkdirSync(targetPath, { recursive: true });
    for (const entry of fs.readdirSync(sourcePath, { withFileTypes: true })) {
      copyPathWithDryRun(
        path.join(sourcePath, entry.name),
        path.join(targetPath, entry.name),
        false,
      );
    }
    return;
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

function removeFileOrDirectoryWithDryRun(targetPath, dryRun) {
  if (!fs.existsSync(targetPath)) {
    return;
  }

  if (dryRun) {
    logInfo(`[dry-run] remove ${targetPath}`);
    return;
  }

  fs.rmSync(targetPath, { recursive: true, force: true });
}

function resolveAngularProjectTsConfig(projectRoot) {
  const appTsConfigPath = path.join(projectRoot, 'tsconfig.app.json');
  if (fs.existsSync(appTsConfigPath)) {
    return appTsConfigPath;
  }

  return path.join(projectRoot, 'tsconfig.json');
}

function upsertTypescriptPluginInTsConfig(configPath, dryRun) {
  if (!fs.existsSync(configPath)) {
    logWarn(`TypeScript config not found: ${configPath}`);
    return;
  }

  const tsConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const compilerOptions = tsConfig.compilerOptions ?? {};
  const plugins = Array.isArray(compilerOptions.plugins)
    ? compilerOptions.plugins
    : [];

  if (
    !plugins.some(
      (plugin) =>
        plugin &&
        typeof plugin === 'object' &&
        plugin.name === '@rs-x/typescript-plugin',
    )
  ) {
    plugins.push({ name: '@rs-x/typescript-plugin' });
  }

  compilerOptions.plugins = plugins;
  tsConfig.compilerOptions = compilerOptions;

  if (dryRun) {
    logInfo(`[dry-run] patch ${configPath}`);
    return;
  }

  fs.writeFileSync(configPath, `${JSON.stringify(tsConfig, null, 2)}\n`, 'utf8');
}

function toFileDependencySpec(fromDir, targetPath) {
  const relative = path.relative(fromDir, targetPath).replace(/\\/gu, '/');
  const normalized = relative.startsWith('.') ? relative : `./${relative}`;
  return `file:${normalized}`;
}

function findLatestTarball(packageDir, packageSlug) {
  if (!fs.existsSync(packageDir)) {
    return null;
  }

  const candidates = [];
  const stack = [packageDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (
        entry.isFile() &&
        entry.name.startsWith(`${packageSlug}-`) &&
        entry.name.endsWith('.tgz')
      ) {
        candidates.push(fullPath);
      }
    }
  }

  candidates.sort();
  if (candidates.length === 0) {
    return null;
  }

  return candidates[candidates.length - 1];
}

function resolveProjectRsxSpecs(
  projectRoot,
  workspaceRoot,
  tarballsDir,
  options = {},
) {
  const includeAngularPackage = Boolean(options.includeAngularPackage);
  const includeReactPackage = Boolean(options.includeReactPackage);
  const versionSpec = options.tag ? options.tag : RSX_PACKAGE_VERSION;
  const defaults = {
    '@rs-x/core': versionSpec,
    '@rs-x/state-manager': versionSpec,
    '@rs-x/expression-parser': versionSpec,
    '@rs-x/compiler': versionSpec,
    '@rs-x/typescript-plugin': versionSpec,
    ...(includeAngularPackage ? { '@rs-x/angular': versionSpec } : {}),
    ...(includeReactPackage ? { '@rs-x/react': versionSpec } : {}),
    '@rs-x/cli': versionSpec,
  };

  const tarballSlugs = {
    '@rs-x/core': 'rs-x-core',
    '@rs-x/state-manager': 'rs-x-state-manager',
    '@rs-x/expression-parser': 'rs-x-expression-parser',
    '@rs-x/compiler': 'rs-x-compiler',
    '@rs-x/typescript-plugin': 'rs-x-typescript-plugin',
    ...(includeAngularPackage ? { '@rs-x/angular': 'rs-x-angular' } : {}),
    ...(includeReactPackage ? { '@rs-x/react': 'rs-x-react' } : {}),
    '@rs-x/cli': 'rs-x-cli',
  };

  if (tarballsDir) {
    const specs = { ...defaults };
    const packageDirBySlug = {
      'rs-x-core': path.join(tarballsDir, 'rs-x-core'),
      'rs-x-state-manager': path.join(tarballsDir, 'rs-x-state-manager'),
      'rs-x-expression-parser': path.join(
        tarballsDir,
        'rs-x-expression-parser',
      ),
      'rs-x-compiler': path.join(tarballsDir, 'rs-x-compiler'),
      'rs-x-typescript-plugin': path.join(
        tarballsDir,
        'rs-x-typescript-plugin',
      ),
      ...(includeAngularPackage
        ? {
            'rs-x-angular': path.join(tarballsDir, 'rs-x-angular'),
          }
        : {}),
      ...(includeReactPackage
        ? {
            'rs-x-react': path.join(tarballsDir, 'rs-x-react'),
          }
        : {}),
      'rs-x-cli': path.join(tarballsDir, 'rs-x-cli'),
    };

    for (const packageName of Object.keys(tarballSlugs)) {
      const slug = tarballSlugs[packageName];
      const tarball = findLatestTarball(tarballsDir, slug);
      if (tarball) {
        specs[packageName] = toFileDependencySpec(projectRoot, tarball);
        continue;
      }

      const packageDir = packageDirBySlug[slug];
      if (packageDir && fs.existsSync(packageDir)) {
        specs[packageName] = toFileDependencySpec(projectRoot, packageDir);
      }
    }
    return specs;
  }

  if (!workspaceRoot) {
    return defaults;
  }

  const packageDirs = {
    '@rs-x/core': path.join(workspaceRoot, 'rs-x-core'),
    '@rs-x/state-manager': path.join(workspaceRoot, 'rs-x-state-manager'),
    '@rs-x/expression-parser': path.join(
      workspaceRoot,
      'rs-x-expression-parser',
    ),
    '@rs-x/compiler': path.join(workspaceRoot, 'rs-x-compiler'),
    '@rs-x/typescript-plugin': path.join(
      workspaceRoot,
      'rs-x-typescript-plugin',
    ),
    ...(includeAngularPackage
      ? {
          '@rs-x/angular': path.join(
            workspaceRoot,
            'rs-x-angular/projects/rsx',
          ),
        }
      : {}),
    ...(includeReactPackage
      ? {
          '@rs-x/react': path.join(workspaceRoot, 'rs-x-react'),
        }
      : {}),
    '@rs-x/cli': path.join(workspaceRoot, 'rs-x-cli'),
  };

  const specs = { ...defaults };
  for (const packageName of Object.keys(packageDirs)) {
    const packageDir = packageDirs[packageName];
    if (!fs.existsSync(packageDir)) {
      continue;
    }

    if (packageName === '@rs-x/cli') {
      const tarball =
        findLatestTarball(path.join(packageDir, 'dist'), 'rs-x-cli') ??
        findLatestTarball(packageDir, 'rs-x-cli');
      if (tarball) {
        specs[packageName] = toFileDependencySpec(projectRoot, tarball);
        continue;
      }
    }

    specs[packageName] = toFileDependencySpec(projectRoot, packageDir);
  }

  return specs;
}

function createProjectPackageJson(projectName, rsxSpecs) {
  const devDependencies = {
    '@rs-x/compiler': rsxSpecs['@rs-x/compiler'],
    '@rs-x/typescript-plugin': rsxSpecs['@rs-x/typescript-plugin'],
    typescript: '^5.9.3',
  };

  return (
    JSON.stringify(
      {
        name: projectName,
        version: '0.1.0',
        private: true,
        type: 'commonjs',
        scripts: {
          build: 'rsx build --project tsconfig.json',
          'typecheck:rsx': 'rsx typecheck --project tsconfig.json',
          start: 'node dist/main.js',
        },
        dependencies: {
          '@rs-x/core': rsxSpecs['@rs-x/core'],
          '@rs-x/state-manager': rsxSpecs['@rs-x/state-manager'],
          '@rs-x/expression-parser': rsxSpecs['@rs-x/expression-parser'],
        },
        devDependencies: {
          ...devDependencies,
        },
      },
      null,
      2,
    ) + '\n'
  );
}

function createProjectTsConfig() {
  return (
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'CommonJS',
          moduleResolution: 'Node',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          outDir: 'dist',
          rootDir: 'src',
          plugins: [
            {
              name: '@rs-x/typescript-plugin',
            },
          ],
        },
        include: ['src/**/*.ts'],
      },
      null,
      2,
    ) + '\n'
  );
}

function normalizeProjectTemplate(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'angular' || normalized === 'a' || normalized === 'ng') {
    return 'angular';
  }
  if (normalized === 'vue' || normalized === 'vuejs' || normalized === 'v') {
    return 'vuejs';
  }
  if (normalized === 'react' || normalized === 'r') {
    return 'react';
  }
  if (
    normalized === 'next' ||
    normalized === 'nextjs' ||
    normalized === 'n' ||
    normalized === 'nx'
  ) {
    return 'nextjs';
  }
  if (
    normalized === 'node' ||
    normalized === 'nodejs' ||
    normalized === 'generic' ||
    normalized === 'js'
  ) {
    return 'nodejs';
  }

  return null;
}

async function promptProjectTemplate() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    console.log('Choose a project template:');
    PROJECT_TEMPLATES.forEach((template, index) => {
      console.log(`  ${index + 1}) ${template}`);
    });

    while (true) {
      const answer = (await rl.question('Template (name or number): '))
        .trim()
        .toLowerCase();
      if (answer.length === 0) {
        continue;
      }

      const byName = normalizeProjectTemplate(answer);
      if (byName) {
        return byName;
      }

      const byNumber = Number.parseInt(answer, 10);
      if (
        Number.isInteger(byNumber) &&
        byNumber >= 1 &&
        byNumber <= PROJECT_TEMPLATES.length
      ) {
        return PROJECT_TEMPLATES[byNumber - 1];
      }

      logWarn(
        `Invalid template '${answer}'. Choose one of: ${PROJECT_TEMPLATES.join(', ')}`,
      );
    }
  } finally {
    rl.close();
  }
}

function withWorkingDirectory(nextCwd, work) {
  const previousCwd = process.cwd();
  process.chdir(nextCwd);
  try {
    return work();
  } finally {
    process.chdir(previousCwd);
  }
}

function createVueRsxAppTemplate() {
  return `<script setup lang="ts">
import { reactive } from 'vue';

import { useRsxExpression } from '@rs-x/vue';

const model = reactive<Record<string, number>>({
  a: 2,
  b: 3,
});

const result = useRsxExpression<number>('a + b', { model });

function incrementA(): void {
  model.a += 1;
}

function incrementB(): void {
  model.b += 1;
}
</script>

<template>
  <main style="font-family: sans-serif; max-width: 640px; margin: 2rem auto; line-height: 1.5;">
    <h1>RS-X + Vue</h1>
    <p>Expression: <code>rsx('a + b')</code></p>
    <p>Model: a={{ model.a }}, b={{ model.b }}</p>
    <p>Result (from RS-X expression value): <strong>{{ result ?? 0 }}</strong></p>
    <div style="display: flex; gap: 0.75rem;">
      <button @click="incrementA">Increment a</button>
      <button @click="incrementB">Increment b</button>
    </div>
  </main>
</template>
`;
}

function applyVueRsxTemplate(projectRoot, dryRun) {
  const appVuePath = path.join(projectRoot, 'src/App.vue');
  if (!fs.existsSync(appVuePath)) {
    logWarn(
      `Vue app file not found at ${appVuePath}. Skipping RS-X example patch.`,
    );
    return;
  }

  writeFileWithDryRun(appVuePath, createVueRsxAppTemplate(), dryRun);
}

async function runProject(flags) {
  const dryRun = Boolean(flags['dry-run']);
  const skipInstall = Boolean(flags['skip-install']);
  const pm = detectPackageManager(flags.pm);
  const tag = resolveInstallTag(flags);
  let projectName = typeof flags.name === 'string' ? flags.name.trim() : '';

  if (!projectName) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    try {
      projectName = await askUntilNonEmpty(rl, 'Project name: ');
    } finally {
      rl.close();
    }
  }

  const projectRoot = path.resolve(process.cwd(), projectName);
  const tarballsDir =
    typeof flags['tarballs-dir'] === 'string'
      ? path.resolve(process.cwd(), flags['tarballs-dir'])
      : typeof process.env.RSX_TARBALLS_DIR === 'string' &&
          process.env.RSX_TARBALLS_DIR.trim().length > 0
        ? path.resolve(process.cwd(), process.env.RSX_TARBALLS_DIR)
        : null;
  const workspaceRoot = findRepoRoot(process.cwd());
  const rsxSpecs = resolveProjectRsxSpecs(
    projectRoot,
    workspaceRoot,
    tarballsDir,
    { tag },
  );
  if (fs.existsSync(projectRoot) && fs.readdirSync(projectRoot).length > 0) {
    logError(`Target directory is not empty: ${projectRoot}`);
    process.exit(1);
  }

  if (!dryRun) {
    fs.mkdirSync(projectRoot, { recursive: true });
  } else {
    logInfo(`[dry-run] create directory ${projectRoot}`);
  }

  writeFileWithDryRun(
    path.join(projectRoot, 'package.json'),
    createProjectPackageJson(projectName, rsxSpecs),
    dryRun,
  );
  writeFileWithDryRun(
    path.join(projectRoot, 'tsconfig.json'),
    createProjectTsConfig(),
    dryRun,
  );
  writeFileWithDryRun(
    path.join(projectRoot, '.gitignore'),
    'node_modules\ndist\n',
    dryRun,
  );
  writeFileWithDryRun(
    path.join(projectRoot, '.vscode/extensions.json'),
    JSON.stringify({ recommendations: [VS_CODE_EXTENSION_ID] }, null, 2) + '\n',
    dryRun,
  );

  writeFileWithDryRun(
    path.join(projectRoot, 'src/rsx-bootstrap.ts'),
    `import { InjectionContainer } from '@rs-x/core';
import { RsXExpressionParserModule } from '@rs-x/expression-parser';

export async function initRsx(): Promise<void> {
  await InjectionContainer.load(RsXExpressionParserModule);
}
`,
    dryRun,
  );

  writeFileWithDryRun(
    path.join(projectRoot, 'src/model.ts'),
    `export interface IModel {
  a: number;
  b: number;
}

export const model: IModel = {
  a: 2,
  b: 3,
};
`,
    dryRun,
  );

  writeFileWithDryRun(
    path.join(projectRoot, 'src/expressions/sample.expression.ts'),
    `import { rsx } from '@rs-x/expression-parser';

import { model } from '../model';

export const sampleExpression = rsx('a + b')(model);
`,
    dryRun,
  );

  writeFileWithDryRun(
    path.join(projectRoot, 'src/main.ts'),
    `import { sampleExpression } from './expressions/sample.expression';
import { initRsx } from './rsx-bootstrap';

async function main(): Promise<void> {
  await initRsx();
  console.log('RS-X sample expression initialized:', Boolean(sampleExpression));
}

void main();
`,
    dryRun,
  );

  if (!skipInstall) {
    const installArgsByPm = {
      pnpm: ['install'],
      npm: ['install'],
      yarn: ['install'],
      bun: ['install'],
    };
    const installArgs = installArgsByPm[pm];
    if (!installArgs) {
      logError(`Unsupported package manager: ${pm}`);
      process.exit(1);
    }

    logInfo(`Installing dependencies with ${pm}...`);
    run(pm, installArgs, { dryRun, cwd: projectRoot });
    logOk('Dependencies installed.');
  } else {
    logInfo('Skipping dependency install (--skip-install).');
  }

  logOk(`Created RS-X project: ${projectRoot}`);
  logInfo('Next steps:');
  console.log(`  cd ${projectName}`);
  if (skipInstall) {
    console.log('  npm install');
  }
  console.log('  npm run build');
  console.log('  npm run start');
}

async function resolveProjectName(nameFromFlags, fallbackName) {
  const fromFlags =
    typeof nameFromFlags === 'string' ? nameFromFlags.trim() : '';
  if (fromFlags.length > 0) {
    return fromFlags;
  }

  const fromFallback =
    typeof fallbackName === 'string' ? fallbackName.trim() : '';
  if (fromFallback.length > 0) {
    return fromFallback;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    return await askUntilNonEmpty(rl, 'Project name: ');
  } finally {
    rl.close();
  }
}

function scaffoldProjectTemplate(template, projectName, pm, flags) {
  const dryRun = Boolean(flags['dry-run']);
  const skipInstall = Boolean(flags['skip-install']);

  if (template === 'angular') {
    const args = [
      '-y',
      '@angular/cli@latest',
      'new',
      projectName,
      '--defaults',
      '--standalone',
      '--routing',
      '--style',
      'css',
      '--skip-git',
    ];
    if (skipInstall) {
      args.push('--skip-install');
    }
    run('npx', args, { dryRun });
    return;
  }

  if (template === 'react') {
    run(
      'npx',
      [
        'create-vite@latest',
        projectName,
        '--no-interactive',
        '--template',
        'react-ts',
      ],
      {
        dryRun,
      },
    );
    return;
  }

  if (template === 'vuejs') {
    run(
      'npx',
      [
        'create-vite@latest',
        projectName,
        '--no-interactive',
        '--template',
        'vue-ts',
      ],
      {
        dryRun,
      },
    );
    return;
  }

  if (template === 'nextjs') {
    const packageManagerFlagByPm = {
      npm: '--use-npm',
      pnpm: '--use-pnpm',
      yarn: '--use-yarn',
      bun: '--use-bun',
    };
    const args = [
      'create-next-app@latest',
      projectName,
      '--yes',
      '--ts',
      '--app',
      '--eslint',
      '--import-alias',
      '@/*',
      packageManagerFlagByPm[pm] ?? '--use-npm',
    ];
    if (skipInstall) {
      args.push('--skip-install');
    }
    run('npx', args, { dryRun });
    return;
  }

  logError(`Unknown project template: ${template}`);
  process.exit(1);
}

function applyAngularDemoStarter(projectRoot, projectName, pm, flags) {
  const dryRun = Boolean(flags['dry-run']);
  const tag = resolveInstallTag(flags);
  const tarballsDir =
    typeof flags['tarballs-dir'] === 'string'
      ? path.resolve(process.cwd(), flags['tarballs-dir'])
      : typeof process.env.RSX_TARBALLS_DIR === 'string' &&
          process.env.RSX_TARBALLS_DIR.trim().length > 0
        ? path.resolve(process.cwd(), process.env.RSX_TARBALLS_DIR)
        : null;
  const workspaceRoot = findRepoRoot(projectRoot);
  const rsxSpecs = resolveProjectRsxSpecs(
    projectRoot,
    workspaceRoot,
    tarballsDir,
    { tag, includeAngularPackage: true },
  );

  const templateFiles = ['README.md', 'src'];
  for (const entry of templateFiles) {
    copyPathWithDryRun(
      path.join(ANGULAR_DEMO_TEMPLATE_DIR, entry),
      path.join(projectRoot, entry),
      dryRun,
    );
  }

  const staleAngularFiles = [
    path.join(projectRoot, 'src/app/app.ts'),
    path.join(projectRoot, 'src/app/app.spec.ts'),
    path.join(projectRoot, 'src/app/app.html'),
    path.join(projectRoot, 'src/app/app.css'),
    path.join(projectRoot, 'src/app/app.routes.ts'),
    path.join(projectRoot, 'src/app/app.config.ts'),
  ];
  for (const stalePath of staleAngularFiles) {
    removeFileOrDirectoryWithDryRun(stalePath, dryRun);
  }

  const readmePath = path.join(projectRoot, 'README.md');
  if (fs.existsSync(readmePath)) {
    const readmeSource = fs.readFileSync(readmePath, 'utf8');
    const nextReadme = readmeSource.replace(
      /^#\s+rsx-angular-example/mu,
      `# ${projectName}`,
    );
    if (dryRun) {
      logInfo(`[dry-run] patch ${readmePath}`);
    } else {
      fs.writeFileSync(readmePath, nextReadme, 'utf8');
    }
  }

  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    logError(
      `package.json not found in generated Angular app: ${packageJsonPath}`,
    );
    process.exit(1);
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const angularTsConfigPath = resolveAngularProjectTsConfig(projectRoot);
  const angularTsConfigRelative = path
    .relative(projectRoot, angularTsConfigPath)
    .replace(/\\/gu, '/');
  packageJson.name = projectName;
  packageJson.private = true;
  packageJson.version = '0.1.0';
  packageJson.scripts = {
    'build:rsx': `rsx build --project ${angularTsConfigRelative} --no-emit --prod`,
    'typecheck:rsx': `rsx typecheck --project ${angularTsConfigRelative}`,
    prebuild: 'npm run build:rsx',
    start: 'npm run build:rsx && ng serve',
    build: 'ng build',
  };
  packageJson.rsx = {
    build: {
      preparse: true,
      preparseFile: 'src/rsx-generated/rsx-aot-preparsed.generated.ts',
      compiled: true,
      compiledFile: 'src/rsx-generated/rsx-aot-compiled.generated.ts',
      registrationFile: 'src/rsx-generated/rsx-aot-registration.generated.ts',
      compiledResolvedEvaluator: false,
    },
  };
  packageJson.dependencies = {
    ...(packageJson.dependencies ?? {}),
    '@rs-x/angular': rsxSpecs['@rs-x/angular'],
    '@rs-x/core': rsxSpecs['@rs-x/core'],
    '@rs-x/state-manager': rsxSpecs['@rs-x/state-manager'],
    '@rs-x/expression-parser': rsxSpecs['@rs-x/expression-parser'],
  };
  packageJson.devDependencies = {
    ...(packageJson.devDependencies ?? {}),
    '@rs-x/cli': rsxSpecs['@rs-x/cli'],
    '@rs-x/compiler': rsxSpecs['@rs-x/compiler'],
    '@rs-x/typescript-plugin': rsxSpecs['@rs-x/typescript-plugin'],
  };

  if (dryRun) {
    logInfo(`[dry-run] patch ${packageJsonPath}`);
  } else {
    fs.writeFileSync(
      packageJsonPath,
      `${JSON.stringify(packageJson, null, 2)}\n`,
      'utf8',
    );
  }

  const angularJsonPath = path.join(projectRoot, 'angular.json');
  if (!fs.existsSync(angularJsonPath)) {
    logError(
      `angular.json not found in generated Angular app: ${angularJsonPath}`,
    );
    process.exit(1);
  }

  const angularJson = JSON.parse(fs.readFileSync(angularJsonPath, 'utf8'));
  const projects = angularJson.projects ?? {};
  const [angularProjectName] = Object.keys(projects);
  if (!angularProjectName) {
    logError('Generated angular.json does not define any projects.');
    process.exit(1);
  }

  const angularProject = projects[angularProjectName];
  const architect = angularProject.architect ?? angularProject.targets;
  const build = architect?.build;
  if (!build) {
    logError('Generated Angular project is missing a build target.');
    process.exit(1);
  }

  const buildOptions = build.options ?? {};
  const styles = Array.isArray(buildOptions.styles) ? buildOptions.styles : [];
  if (!styles.includes('src/styles.css')) {
    styles.push('src/styles.css');
  }
  buildOptions.styles = styles;
  buildOptions.preserveSymlinks = true;

  const registrationFile =
    'src/rsx-generated/rsx-aot-registration.generated.ts';
  let polyfills = buildOptions.polyfills;
  if (typeof polyfills === 'string') {
    polyfills = [polyfills];
  } else if (!Array.isArray(polyfills)) {
    polyfills = [];
  }
  if (!polyfills.includes(registrationFile)) {
    polyfills.push(registrationFile);
  }
  buildOptions.polyfills = polyfills;
  build.options = buildOptions;

  if (build.configurations?.production?.budgets) {
    delete build.configurations.production.budgets;
  }

  if (dryRun) {
    logInfo(`[dry-run] patch ${angularJsonPath}`);
  } else {
    fs.writeFileSync(
      angularJsonPath,
      `${JSON.stringify(angularJson, null, 2)}\n`,
      'utf8',
    );
  }

  if (!Boolean(flags['skip-install'])) {
    logInfo(`Refreshing ${pm} dependencies for the RS-X Angular starter...`);
    run(pm, ['install'], { dryRun });
    logOk('Angular starter dependencies are up to date.');
  }
}

function applyReactDemoStarter(projectRoot, projectName, pm, flags) {
  const dryRun = Boolean(flags['dry-run']);
  const tag = resolveInstallTag(flags);
  const tarballsDir =
    typeof flags['tarballs-dir'] === 'string'
      ? path.resolve(process.cwd(), flags['tarballs-dir'])
      : typeof process.env.RSX_TARBALLS_DIR === 'string' &&
          process.env.RSX_TARBALLS_DIR.trim().length > 0
        ? path.resolve(process.cwd(), process.env.RSX_TARBALLS_DIR)
        : null;
  const workspaceRoot = findRepoRoot(projectRoot);
  const rsxSpecs = resolveProjectRsxSpecs(
    projectRoot,
    workspaceRoot,
    tarballsDir,
    { tag, includeReactPackage: true },
  );

  const templateFiles = [
    'README.md',
    'index.html',
    'src',
    'tsconfig.json',
    'vite.config.ts',
  ];
  for (const entry of templateFiles) {
    copyPathWithDryRun(
      path.join(REACT_DEMO_TEMPLATE_DIR, entry),
      path.join(projectRoot, entry),
      dryRun,
    );
  }

  const staleReactFiles = [
    path.join(projectRoot, 'src/App.tsx'),
    path.join(projectRoot, 'src/App.css'),
    path.join(projectRoot, 'src/index.css'),
    path.join(projectRoot, 'src/vite-env.d.ts'),
    path.join(projectRoot, 'src/assets'),
    path.join(projectRoot, 'public'),
    path.join(projectRoot, 'eslint.config.js'),
    path.join(projectRoot, 'eslint.config.ts'),
    path.join(projectRoot, 'tsconfig.app.json'),
    path.join(projectRoot, 'tsconfig.node.json'),
  ];
  for (const stalePath of staleReactFiles) {
    removeFileOrDirectoryWithDryRun(stalePath, dryRun);
  }

  const readmePath = path.join(projectRoot, 'README.md');
  if (fs.existsSync(readmePath)) {
    const readmeSource = fs.readFileSync(readmePath, 'utf8');
    const nextReadme = readmeSource.replace(
      /^#\s+rsx-react-example/mu,
      `# ${projectName}`,
    );
    if (dryRun) {
      logInfo(`[dry-run] patch ${readmePath}`);
    } else {
      fs.writeFileSync(readmePath, nextReadme, 'utf8');
    }
  }

  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    logError(`package.json not found in generated React app: ${packageJsonPath}`);
    process.exit(1);
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.name = projectName;
  packageJson.private = true;
  packageJson.version = '0.1.0';
  packageJson.type = 'module';
  packageJson.scripts = {
    'build:rsx': 'rsx build --project tsconfig.json --no-emit --prod',
    dev: 'npm run build:rsx && vite',
    build: 'npm run build:rsx && vite build',
    preview: 'vite preview',
  };
  packageJson.rsx = {
    build: {
      preparse: true,
      preparseFile: 'src/rsx-generated/rsx-aot-preparsed.generated.ts',
      compiled: true,
      compiledFile: 'src/rsx-generated/rsx-aot-compiled.generated.ts',
      compiledResolvedEvaluator: false,
    },
  };
  packageJson.dependencies = {
    react: packageJson.dependencies?.react ?? '^19.2.4',
    'react-dom': packageJson.dependencies?.['react-dom'] ?? '^19.2.4',
    '@rs-x/core': rsxSpecs['@rs-x/core'],
    '@rs-x/state-manager': rsxSpecs['@rs-x/state-manager'],
    '@rs-x/expression-parser': rsxSpecs['@rs-x/expression-parser'],
    '@rs-x/react': rsxSpecs['@rs-x/react'],
  };
  packageJson.devDependencies = {
    typescript: packageJson.devDependencies?.typescript ?? '^5.9.3',
    vite: packageJson.devDependencies?.vite ?? '^7.3.1',
    '@vitejs/plugin-react':
      packageJson.devDependencies?.['@vitejs/plugin-react'] ?? '^5.1.4',
    '@types/react': packageJson.devDependencies?.['@types/react'] ?? '^19.2.2',
    '@types/react-dom':
      packageJson.devDependencies?.['@types/react-dom'] ?? '^19.2.2',
    '@rs-x/cli': rsxSpecs['@rs-x/cli'],
    '@rs-x/compiler': rsxSpecs['@rs-x/compiler'],
    '@rs-x/typescript-plugin': rsxSpecs['@rs-x/typescript-plugin'],
  };

  if (dryRun) {
    logInfo(`[dry-run] patch ${packageJsonPath}`);
  } else {
    fs.writeFileSync(
      packageJsonPath,
      `${JSON.stringify(packageJson, null, 2)}\n`,
      'utf8',
    );
  }

  const tsConfigPath = path.join(projectRoot, 'tsconfig.json');
  if (fs.existsSync(tsConfigPath)) {
    upsertTypescriptPluginInTsConfig(tsConfigPath, dryRun);
  }

  if (!Boolean(flags['skip-install'])) {
    logInfo(`Refreshing ${pm} dependencies for the RS-X React starter...`);
    run(pm, ['install'], { dryRun });
    logOk('React starter dependencies are up to date.');
  }
}

function applyNextDemoStarter(projectRoot, projectName, pm, flags) {
  const dryRun = Boolean(flags['dry-run']);
  const tag = resolveInstallTag(flags);
  const tarballsDir =
    typeof flags['tarballs-dir'] === 'string'
      ? path.resolve(process.cwd(), flags['tarballs-dir'])
      : typeof process.env.RSX_TARBALLS_DIR === 'string' &&
          process.env.RSX_TARBALLS_DIR.trim().length > 0
        ? path.resolve(process.cwd(), process.env.RSX_TARBALLS_DIR)
        : null;
  const workspaceRoot = findRepoRoot(projectRoot);
  const rsxSpecs = resolveProjectRsxSpecs(
    projectRoot,
    workspaceRoot,
    tarballsDir,
    { tag, includeReactPackage: true },
  );

  const templateFiles = ['README.md', 'app', 'components', 'hooks', 'lib'];
  for (const entry of templateFiles) {
    copyPathWithDryRun(
      path.join(NEXT_DEMO_TEMPLATE_DIR, entry),
      path.join(projectRoot, entry),
      dryRun,
    );
  }

  const readmePath = path.join(projectRoot, 'README.md');
  if (fs.existsSync(readmePath)) {
    const readmeSource = fs.readFileSync(readmePath, 'utf8');
    const nextReadme = readmeSource.replace(
      /^#\s+rsx-next-example/mu,
      `# ${projectName}`,
    );
    if (dryRun) {
      logInfo(`[dry-run] patch ${readmePath}`);
    } else {
      fs.writeFileSync(readmePath, nextReadme, 'utf8');
    }
  }

  const publicDir = path.join(projectRoot, 'public');
  removeFileOrDirectoryWithDryRun(publicDir, dryRun);

  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    logError(`package.json not found in generated Next.js app: ${packageJsonPath}`);
    process.exit(1);
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.name = projectName;
  packageJson.private = true;
  packageJson.version = '0.1.0';
  packageJson.scripts = {
    ...packageJson.scripts,
    'build:rsx': 'rsx build --project tsconfig.json --no-emit --prod',
    dev: 'npm run build:rsx && next dev',
    build: 'npm run build:rsx && next build',
    start: 'next start',
  };
  packageJson.rsx = {
    build: {
      preparse: true,
      preparseFile: 'app/rsx-generated/rsx-aot-preparsed.generated.ts',
      compiled: true,
      compiledFile: 'app/rsx-generated/rsx-aot-compiled.generated.ts',
      compiledResolvedEvaluator: false,
    },
  };
  packageJson.dependencies = {
    ...(packageJson.dependencies ?? {}),
    '@rs-x/core': rsxSpecs['@rs-x/core'],
    '@rs-x/state-manager': rsxSpecs['@rs-x/state-manager'],
    '@rs-x/expression-parser': rsxSpecs['@rs-x/expression-parser'],
    '@rs-x/react': rsxSpecs['@rs-x/react'],
  };
  packageJson.devDependencies = {
    ...(packageJson.devDependencies ?? {}),
    '@rs-x/cli': rsxSpecs['@rs-x/cli'],
    '@rs-x/compiler': rsxSpecs['@rs-x/compiler'],
    '@rs-x/typescript-plugin': rsxSpecs['@rs-x/typescript-plugin'],
  };

  if (dryRun) {
    logInfo(`[dry-run] patch ${packageJsonPath}`);
  } else {
    fs.writeFileSync(
      packageJsonPath,
      `${JSON.stringify(packageJson, null, 2)}\n`,
      'utf8',
    );
  }

  const tsConfigPath = path.join(projectRoot, 'tsconfig.json');
  if (fs.existsSync(tsConfigPath)) {
    upsertTypescriptPluginInTsConfig(tsConfigPath, dryRun);
  }

  if (!Boolean(flags['skip-install'])) {
    logInfo(`Refreshing ${pm} dependencies for the RS-X Next.js starter...`);
    run(pm, ['install'], { dryRun });
    logOk('Next.js starter dependencies are up to date.');
  }
}

async function runProjectWithTemplate(template, flags) {
  const normalizedTemplate = normalizeProjectTemplate(template);
  if (!normalizedTemplate) {
    logError(
      `Unsupported template '${template}'. Choose one of: ${PROJECT_TEMPLATES.join(', ')}`,
    );
    process.exit(1);
  }

  if (normalizedTemplate === 'nodejs') {
    await runProject(flags);
    return;
  }

  const pm = detectPackageManager(flags.pm);
  const projectName = await resolveProjectName(flags.name, flags._nameHint);
  const projectRoot = path.resolve(process.cwd(), projectName);
  if (fs.existsSync(projectRoot) && fs.readdirSync(projectRoot).length > 0) {
    logError(`Target directory is not empty: ${projectRoot}`);
    process.exit(1);
  }

  scaffoldProjectTemplate(normalizedTemplate, projectName, pm, flags);
  const dryRun = Boolean(flags['dry-run']);
  if (dryRun) {
    logInfo(`[dry-run] setup RS-X in ${projectRoot}`);
    return;
  }

  withWorkingDirectory(projectRoot, () => {
    if (normalizedTemplate === 'angular') {
      applyAngularDemoStarter(projectRoot, projectName, pm, flags);
      return;
    }
    if (normalizedTemplate === 'react') {
      applyReactDemoStarter(projectRoot, projectName, pm, flags);
      return;
    }
    if (normalizedTemplate === 'nextjs') {
      applyNextDemoStarter(projectRoot, projectName, pm, flags);
      return;
    }
    if (normalizedTemplate === 'vuejs') {
      runSetupVue({
        ...flags,
        entry: flags.entry ?? 'src/main.ts',
      });
      applyVueRsxTemplate(projectRoot, dryRun);
    }
  });

  logOk(`Created RS-X ${normalizedTemplate} project: ${projectRoot}`);
  logInfo('Next steps:');
  console.log(`  cd ${projectName}`);
  if (Boolean(flags['skip-install'])) {
    console.log(`  ${pm} install`);
  }
  if (normalizedTemplate === 'angular') {
    console.log(`  ${pm} run start`);
  } else {
    console.log(`  ${pm} run dev`);
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

  if (Object.prototype.hasOwnProperty.call(dependencies, 'vue')) {
    return 'vuejs';
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
    vuejs: ['src/main.ts', 'src/main.js'],
    next: [
      'app/layout.tsx',
      'app/layout.jsx',
      'pages/_app.tsx',
      'pages/_app.jsx',
    ],
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

  const candidates =
    candidatesByContext[context] ?? candidatesByContext.generic;
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
  if (content.includes('createRoot(') || content.includes('ReactDOM.render(')) {
    return 'react';
  }
  if (content.includes('createApp(') && content.includes('.mount(')) {
    return 'vuejs';
  }
  if (content.includes("from 'next/") || content.includes('from "next/')) {
    return 'next';
  }

  return 'generic';
}

function rsxBootstrapFilePath(entryFile) {
  const ext = path.extname(entryFile).toLowerCase();
  const fileName =
    ext === '.js' || ext === '.jsx' ? 'rsx-bootstrap.js' : 'rsx-bootstrap.ts';
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
  const relative = path
    .relative(path.dirname(fromFile), targetFile)
    .replace(/\\/gu, '/');
  const withDot = relative.startsWith('.') ? relative : `./${relative}`;
  return stripFileExtension(withDot);
}

function injectImport(source, importStatement) {
  if (source.includes(importStatement)) {
    return source;
  }

  const lines = source.split('\n');
  let insertAt = 0;

  while (
    insertAt < lines.length &&
    lines[insertAt].trim().startsWith('import ')
  ) {
    insertAt += 1;
  }

  const next = [
    ...lines.slice(0, insertAt),
    importStatement,
    ...lines.slice(insertAt),
  ];
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
  const reactStartPattern =
    /(ReactDOM\s*\.\s*)?createRoot\([\s\S]*?\)\s*\.\s*render\([\s\S]*?\);/mu;
  const match = source.match(reactStartPattern);
  if (!match) {
    return null;
  }

  const renderCall = match[0].trim();
  const replacement = `const __rsxStart = async () => {\n  await initRsx();\n${indentBlock(renderCall, 2)}\n};\n\nvoid __rsxStart();`;
  return source.replace(reactStartPattern, replacement);
}

function wrapAngularEntry(source) {
  const angularBootstrapPattern =
    /bootstrapApplication\([\s\S]*?\)(?:\s*\.\s*catch\([\s\S]*?\))?\s*;/mu;
  const angularModulePattern =
    /platformBrowserDynamic\(\)\s*\.\s*bootstrapModule\([\s\S]*?\)(?:\s*\.\s*catch\([\s\S]*?\))?\s*;/mu;

  const match =
    source.match(angularBootstrapPattern) ?? source.match(angularModulePattern);
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

function wrapVueEntry(source) {
  const vueStartPattern =
    /createApp\([\s\S]*?\)\s*\.\s*mount\([\s\S]*?\)\s*;/mu;
  const match = source.match(vueStartPattern);
  if (!match) {
    return null;
  }

  const mountCall = match[0].trim();
  const replacement = `const __rsxBootstrap = async () => {\n  await initRsx();\n${indentBlock(mountCall, 2)}\n};\n\nvoid __rsxBootstrap();`;
  return source.replace(vueStartPattern, replacement);
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
  const fileName =
    ext === '.js' || ext === '.jsx'
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
  if (
    original.includes('RsxBootstrapGate') &&
    original.includes('rsx-bootstrap-gate')
  ) {
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
  } else if (context === 'vuejs') {
    updated = wrapVueEntry(updated);
    if (!updated) {
      logWarn(`Could not find Vue app mount call in ${entryFile}.`);
      return false;
    }
  } else if (context === 'generic') {
    updated = wrapGenericEntry(updated);
    if (!updated) {
      logWarn(
        `Could not find a generic startup call (for example main();) in ${entryFile}.`,
      );
      return false;
    }
  } else {
    logWarn(
      `Automatic bootstrap wiring is not yet supported for context '${context}'.`,
    );
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
  const tag = resolveInstallTag(flags);
  const projectRoot = process.cwd();

  if (!skipInstall) {
    installRuntimePackages(pm, dryRun, tag);
    installCompilerPackages(pm, dryRun, tag);
  } else {
    logInfo('Skipping package installation (--skip-install).');
  }

  const context = detectProjectContext(projectRoot);
  const entryFile = resolveEntryFile(projectRoot, context, flags.entry);
  const effectiveContext = flags.entry
    ? (inferContextFromEntryFile(entryFile) ?? context)
    : context;

  if (!entryFile) {
    logWarn('Could not detect an application entry file automatically.');
    logInfo(
      'Use `rsx init --entry <path-to-entry-file>` to force bootstrap wiring.',
    );
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
      console.log(
        '  // wrap app children with <RsxBootstrapGate>...</RsxBootstrapGate>',
      );
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

  logOk('RS-X init completed.');
}

function upsertRsxBuildConfigInPackageJson(projectRoot, dryRun) {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const currentRsx = packageJson.rsx ?? {};
  const currentBuild = currentRsx.build ?? {};
  const nextBuild = {
    preparse: true,
    preparseFile: 'src/rsx-generated/rsx-aot-preparsed.generated.ts',
    compiled: true,
    compiledFile: 'src/rsx-generated/rsx-aot-compiled.generated.ts',
    registrationFile: 'src/rsx-generated/rsx-aot-registration.generated.ts',
    compiledResolvedEvaluator: false,
    ...currentBuild,
  };

  const nextPackageJson = {
    ...packageJson,
    rsx: {
      ...currentRsx,
      build: nextBuild,
    },
  };

  if (dryRun) {
    logInfo(`[dry-run] patch ${packageJsonPath} (rsx.build)`);
    return true;
  }

  fs.writeFileSync(
    packageJsonPath,
    `${JSON.stringify(nextPackageJson, null, 2)}\n`,
    'utf8',
  );
  logOk(`Patched ${packageJsonPath} (rsx.build)`);
  return true;
}

function ensureAngularProvidersInEntry(entryFile, dryRun) {
  if (!fs.existsSync(entryFile)) {
    return false;
  }

  const original = fs.readFileSync(entryFile, 'utf8');
  if (original.includes('providexRsx')) {
    logInfo(`Angular entry already includes providexRsx: ${entryFile}`);
    return true;
  }

  if (!original.includes('bootstrapApplication(')) {
    logWarn(
      `Could not automatically patch Angular providers in ${entryFile}. Expected bootstrapApplication(...).`,
    );
    logInfo(
      "Manual setup: import { providexRsx } from '@rs-x/angular' and add providers: [...providexRsx()] to bootstrapApplication(...).",
    );
    return false;
  }

  const sourceWithImport = injectImport(
    original,
    "import { providexRsx } from '@rs-x/angular';",
  );

  let updated = sourceWithImport;
  if (
    /bootstrapApplication\([\s\S]*?,\s*\{[\s\S]*?providers\s*:/mu.test(updated)
  ) {
    updated = updated.replace(
      /providers\s*:\s*\[/mu,
      'providers: [...providexRsx(), ',
    );
  } else if (/bootstrapApplication\([\s\S]*?,\s*\{/mu.test(updated)) {
    updated = updated.replace(
      /bootstrapApplication\(([\s\S]*?),\s*\{/mu,
      'bootstrapApplication($1, {\n  providers: [...providexRsx()],',
    );
  } else {
    updated = updated.replace(
      /bootstrapApplication\(([\s\S]*?)\)\s*(?:\.catch\([\s\S]*?\))?\s*;/mu,
      'bootstrapApplication($1, {\n  providers: [...providexRsx()],\n}).catch((error) => {\n  console.error(error);\n});',
    );
  }

  if (updated === sourceWithImport) {
    logWarn(`Could not automatically inject providexRsx into ${entryFile}.`);
    logInfo(
      "Manual setup: import { providexRsx } from '@rs-x/angular' and add providers: [...providexRsx()] to bootstrapApplication(...).",
    );
    return false;
  }

  if (dryRun) {
    logInfo(`[dry-run] patch ${entryFile} (providexRsx)`);
    return true;
  }

  fs.writeFileSync(entryFile, updated, 'utf8');
  logOk(`Patched ${entryFile} to include providexRsx.`);
  return true;
}

function upsertScriptInPackageJson(
  projectRoot,
  scriptName,
  scriptValue,
  dryRun,
) {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const scripts = packageJson.scripts ?? {};
  if (scripts[scriptName] === scriptValue) {
    return true;
  }

  scripts[scriptName] = scriptValue;
  packageJson.scripts = scripts;

  if (dryRun) {
    logInfo(`[dry-run] patch ${packageJsonPath} (scripts.${scriptName})`);
    return true;
  }

  fs.writeFileSync(
    packageJsonPath,
    `${JSON.stringify(packageJson, null, 2)}\n`,
    'utf8',
  );
  logOk(`Patched ${packageJsonPath} (scripts.${scriptName})`);
  return true;
}

function createRsxWebpackLoaderFile(projectRoot, dryRun) {
  const loaderPath = path.join(projectRoot, 'rsx-webpack-loader.cjs');
  const loaderSource = `const path = require('node:path');
const ts = require('typescript');
const { createExpressionCachePreloadTransformer } = require('@rs-x/compiler');

function normalizeFileName(fileName) {
  return path.resolve(fileName).replace(/\\\\/gu, '/');
}

function buildTransformedSourceMap(tsconfigPath) {
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    return new Map();
  }

  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(tsconfigPath),
    undefined,
    tsconfigPath,
  );
  if (parsed.errors.length > 0) {
    return new Map();
  }

  const program = ts.createProgram({
    rootNames: parsed.fileNames,
    options: parsed.options,
  });
  const transformer = createExpressionCachePreloadTransformer(program);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const transformedByFile = new Map();

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) {
      continue;
    }

    if (sourceFile.fileName.includes('/node_modules/')) {
      continue;
    }

    const transformed = ts.transform(sourceFile, [transformer]);
    const transformedSource = transformed.transformed[0];
    const transformedText = printer.printFile(transformedSource);
    transformed.dispose();

    transformedByFile.set(normalizeFileName(sourceFile.fileName), transformedText);
  }

  return transformedByFile;
}

module.exports = function rsxWebpackLoader(source) {
  const callback = this.async();
  const tsconfigPath = normalizeFileName(
    path.resolve(this.rootContext || process.cwd(), 'tsconfig.json'),
  );
  const transformedByFile = buildTransformedSourceMap(tsconfigPath);
  const transformed = transformedByFile.get(normalizeFileName(this.resourcePath));
  callback(null, transformed ?? source);
};
`;

  if (dryRun) {
    logInfo(`[dry-run] create ${loaderPath}`);
  } else {
    fs.writeFileSync(loaderPath, loaderSource, 'utf8');
    logOk(`Created ${loaderPath}`);
  }

  return loaderPath;
}

function wireRsxVitePlugin(projectRoot, dryRun) {
  const pluginFile = path.join(projectRoot, 'rsx-vite-plugin.mjs');
  const pluginSource = `import path from 'node:path';

import ts from 'typescript';

import { createExpressionCachePreloadTransformer } from '@rs-x/compiler';

function normalizeFileName(fileName) {
  return path.resolve(fileName).replace(/\\\\/gu, '/');
}

function buildTransformedSourceMap(tsconfigPath) {
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    return new Map();
  }

  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(tsconfigPath),
    undefined,
    tsconfigPath,
  );
  if (parsed.errors.length > 0) {
    return new Map();
  }

  const program = ts.createProgram({
    rootNames: parsed.fileNames,
    options: parsed.options,
  });
  const transformer = createExpressionCachePreloadTransformer(program);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const transformedByFile = new Map();

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) {
      continue;
    }

    if (sourceFile.fileName.includes('/node_modules/')) {
      continue;
    }

    const transformed = ts.transform(sourceFile, [transformer]);
    const transformedSource = transformed.transformed[0];
    const transformedText = printer.printFile(transformedSource);
    transformed.dispose();

    transformedByFile.set(normalizeFileName(sourceFile.fileName), transformedText);
  }

  return transformedByFile;
}

export function rsxVitePlugin(tsconfigPath = 'tsconfig.json') {
  let transformedByFile = new Map();
  let resolvedTsConfigPath = '';

  const refresh = () => {
    transformedByFile = buildTransformedSourceMap(resolvedTsConfigPath);
  };

  return {
    name: 'rsx-vite-transform',
    enforce: 'pre',
    configResolved(config) {
      resolvedTsConfigPath = normalizeFileName(path.resolve(config.root, tsconfigPath));
      refresh();
    },
    buildStart() {
      if (!resolvedTsConfigPath) {
        resolvedTsConfigPath = normalizeFileName(path.resolve(process.cwd(), tsconfigPath));
      }
      refresh();
    },
    handleHotUpdate() {
      refresh();
    },
    transform(_code, id) {
      const normalizedId = normalizeFileName(id.split('?')[0]);
      const transformed = transformedByFile.get(normalizedId);
      if (!transformed) {
        return null;
      }

      return {
        code: transformed,
        map: null,
      };
    },
  };
}
`;

  if (dryRun) {
    logInfo(`[dry-run] create ${pluginFile}`);
  } else {
    fs.writeFileSync(pluginFile, pluginSource, 'utf8');
    logOk(`Created ${pluginFile}`);
  }

  const viteConfigCandidates = [
    'vite.config.ts',
    'vite.config.mts',
    'vite.config.js',
    'vite.config.mjs',
  ].map((fileName) => path.join(projectRoot, fileName));
  const viteConfigPath = viteConfigCandidates.find((candidate) =>
    fs.existsSync(candidate),
  );
  if (!viteConfigPath) {
    logWarn(
      'No vite.config.[ts|mts|js|mjs] found. RS-X Vite plugin file was created, but config patch was skipped.',
    );
    logInfo(
      "Add it manually: import { rsxVitePlugin } from './rsx-vite-plugin.mjs' and include rsxVitePlugin() in plugins.",
    );
    return;
  }

  const original = fs.readFileSync(viteConfigPath, 'utf8');
  if (original.includes('rsxVitePlugin(')) {
    logInfo(`Vite config already includes RS-X plugin: ${viteConfigPath}`);
    return;
  }

  let updated = original;
  const importStatement =
    "import { rsxVitePlugin } from './rsx-vite-plugin.mjs';";
  if (!updated.includes(importStatement)) {
    const lines = updated.split('\n');
    let insertAt = 0;
    while (
      insertAt < lines.length &&
      lines[insertAt].trim().startsWith('import ')
    ) {
      insertAt += 1;
    }
    lines.splice(insertAt, 0, importStatement);
    updated = lines.join('\n');
  }

  if (/plugins\s*:\s*\[/u.test(updated)) {
    updated = updated.replace(
      /plugins\s*:\s*\[/u,
      'plugins: [rsxVitePlugin(), ',
    );
  } else if (/defineConfig\s*\(\s*\{/u.test(updated)) {
    updated = updated.replace(
      /defineConfig\s*\(\s*\{/u,
      'defineConfig({\n  plugins: [rsxVitePlugin()],',
    );
  } else {
    logWarn(`Could not patch Vite config automatically: ${viteConfigPath}`);
    logInfo('Add `rsxVitePlugin()` to your Vite plugins manually.');
    return;
  }

  if (dryRun) {
    logInfo(`[dry-run] patch ${viteConfigPath}`);
    return;
  }

  fs.writeFileSync(viteConfigPath, updated, 'utf8');
  logOk(`Patched ${viteConfigPath} with RS-X Vite plugin.`);
}

function wireRsxNextWebpack(projectRoot, dryRun) {
  const loaderPath = createRsxWebpackLoaderFile(projectRoot, dryRun);
  const nextConfigJs = path.join(projectRoot, 'next.config.js');
  const nextConfigMjs = path.join(projectRoot, 'next.config.mjs');
  const nextConfigTs = path.join(projectRoot, 'next.config.ts');

  if (fs.existsSync(nextConfigMjs) || fs.existsSync(nextConfigTs)) {
    logWarn(
      'Detected next.config.mjs/ts. Automatic RS-X patch currently supports next.config.js only.',
    );
    logInfo(`Add webpack rule manually with loader: ${loaderPath}`);
    return;
  }

  const patchBlock = `
const __rsxWebpackLoaderPath = require('node:path').resolve(__dirname, './rsx-webpack-loader.cjs');
const __rsxApply = (nextConfigOrFactory) => {
  if (typeof nextConfigOrFactory === 'function') {
    return (...args) => __rsxApply(nextConfigOrFactory(...args));
  }

  const nextConfig = nextConfigOrFactory ?? {};
  const previousWebpack = nextConfig.webpack;
  return {
    ...nextConfig,
    webpack(config, options) {
      config.module.rules.unshift({
        test: /\\.[jt]sx?$/u,
        exclude: /node_modules/u,
        use: [
          {
            loader: __rsxWebpackLoaderPath,
          },
        ],
      });

      if (typeof previousWebpack === 'function') {
        return previousWebpack(config, options);
      }

      return config;
    },
  };
};

module.exports = __rsxApply(module.exports);
`;

  if (!fs.existsSync(nextConfigJs)) {
    const source = `/** @type {import('next').NextConfig} */
module.exports = {};
${patchBlock}
`;
    if (dryRun) {
      logInfo(`[dry-run] create ${nextConfigJs}`);
    } else {
      fs.writeFileSync(nextConfigJs, source, 'utf8');
      logOk(`Created ${nextConfigJs}`);
    }
    return;
  }

  const original = fs.readFileSync(nextConfigJs, 'utf8');
  if (original.includes('__rsxWebpackLoaderPath')) {
    logInfo(
      `Next config already includes RS-X webpack loader: ${nextConfigJs}`,
    );
    return;
  }

  if (dryRun) {
    logInfo(`[dry-run] patch ${nextConfigJs}`);
    return;
  }

  fs.writeFileSync(nextConfigJs, `${original}\n${patchBlock}\n`, 'utf8');
  logOk(`Patched ${nextConfigJs} with RS-X webpack loader.`);
}

function runSetupReact(flags) {
  const dryRun = Boolean(flags['dry-run']);
  const pm = detectPackageManager(flags.pm);
  const tag = resolveInstallTag(flags);
  const projectRoot = process.cwd();
  const angularTsConfigPath = resolveAngularProjectTsConfig(projectRoot);
  const angularTsConfigRelative = path
    .relative(projectRoot, angularTsConfigPath)
    .replace(/\\/gu, '/');
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    logError(`package.json not found in ${projectRoot}`);
    process.exit(1);
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const allDependencies = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
  };
  if (!allDependencies.react) {
    logWarn(
      'React dependency not detected in package.json; continuing anyway.',
    );
  }

  runInit({
    ...flags,
    'skip-vscode': true,
  });
  if (!Boolean(flags['skip-install'])) {
    installPackages(pm, ['@rs-x/react'], {
      dev: false,
      dryRun,
      tag,
      label: 'RS-X React bindings',
    });
  } else {
    logInfo('Skipping RS-X React bindings install (--skip-install).');
  }
  wireRsxVitePlugin(projectRoot, dryRun);
  logOk('RS-X React setup completed.');
}

function runSetupNext(flags) {
  const dryRun = Boolean(flags['dry-run']);
  const pm = detectPackageManager(flags.pm);
  const tag = resolveInstallTag(flags);
  runInit({
    ...flags,
    'skip-vscode': true,
  });
  if (!Boolean(flags['skip-install'])) {
    installPackages(pm, ['@rs-x/react'], {
      dev: false,
      dryRun,
      tag,
      label: 'RS-X React bindings',
    });
  } else {
    logInfo('Skipping RS-X React bindings install (--skip-install).');
  }
  wireRsxNextWebpack(process.cwd(), dryRun);
  logOk('RS-X Next.js setup completed.');
}

function runSetupVue(flags) {
  const dryRun = Boolean(flags['dry-run']);
  const pm = detectPackageManager(flags.pm);
  const tag = resolveInstallTag(flags);
  runInit({
    ...flags,
    'skip-vscode': true,
  });
  if (!Boolean(flags['skip-install'])) {
    installPackages(pm, ['@rs-x/vue'], {
      dev: false,
      dryRun,
      tag,
      label: 'RS-X Vue bindings',
    });
  } else {
    logInfo('Skipping RS-X Vue bindings install (--skip-install).');
  }
  wireRsxVitePlugin(process.cwd(), dryRun);
  logOk('RS-X Vue setup completed.');
}

function runSetupAngular(flags) {
  const dryRun = Boolean(flags['dry-run']);
  const pm = detectPackageManager(flags.pm);
  const tag = resolveInstallTag(flags);
  const projectRoot = process.cwd();

  if (!Boolean(flags['skip-install'])) {
    installRuntimePackages(pm, dryRun, tag);
    installCompilerPackages(pm, dryRun, tag);
    installPackages(pm, ['@rs-x/angular'], {
      dev: false,
      dryRun,
      tag,
      label: 'RS-X Angular bindings',
    });
  } else {
    logInfo('Skipping package installation (--skip-install).');
  }

  const entryFile = resolveEntryFile(projectRoot, 'angular', flags.entry);
  if (entryFile) {
    logInfo(`Using Angular entry file: ${entryFile}`);
    ensureAngularProvidersInEntry(entryFile, dryRun);
  } else {
    logWarn('Could not detect an Angular entry file automatically.');
    logInfo(
      'Manual setup: add providexRsx() to bootstrapApplication(...) in your main entry file.',
    );
  }

  upsertRsxBuildConfigInPackageJson(projectRoot, dryRun);

  upsertScriptInPackageJson(
    projectRoot,
    'build:rsx',
    `rsx build --project ${angularTsConfigRelative} --no-emit --prod`,
    dryRun,
  );
  upsertScriptInPackageJson(
    projectRoot,
    'typecheck:rsx',
    `rsx typecheck --project ${angularTsConfigRelative}`,
    dryRun,
  );

  const rsxRegistrationFile = path.join(
    projectRoot,
    'src/rsx-generated/rsx-aot-registration.generated.ts',
  );
  ensureAngularPolyfillsContainsFile({
    projectRoot,
    configPath: angularTsConfigPath,
    filePath: rsxRegistrationFile,
    dryRun,
  });

  logOk('RS-X Angular setup completed.');
}

function runSetupAuto(flags) {
  const projectRoot = process.cwd();
  const context = detectProjectContext(projectRoot);
  const tag = resolveInstallTag(flags);

  if (context === 'react') {
    logInfo('Auto-detected framework: react');
    runSetupReact(flags);
    return;
  }

  if (context === 'vuejs') {
    logInfo('Auto-detected framework: vuejs');
    runSetupVue(flags);
    return;
  }

  if (context === 'next') {
    logInfo('Auto-detected framework: next');
    runSetupNext(flags);
    return;
  }

  if (context === 'angular') {
    logInfo('Auto-detected framework: angular');
    runSetupAngular(flags);
    return;
  }

  logInfo('No framework-specific setup detected; running generic setup.');
  const pm = detectPackageManager(flags.pm);
  installRuntimePackages(pm, Boolean(flags['dry-run']), tag);
  installCompilerPackages(pm, Boolean(flags['dry-run']), tag);
}

function resolveProjectModule(projectRoot, moduleName) {
  try {
    const resolvedPath = require.resolve(moduleName, { paths: [projectRoot] });
    return require(resolvedPath);
  } catch {
    return null;
  }
}

function runBuild(flags) {
  const invocationRoot = process.cwd();
  const dryRun = Boolean(flags['dry-run']);
  const noEmit = Boolean(flags['no-emit']);
  const prodMode = parseBooleanFlag(flags.prod, false);
  const projectArg =
    typeof flags.project === 'string' ? flags.project : 'tsconfig.json';
  const configPath = path.resolve(invocationRoot, projectArg);
  const projectRoot = path.dirname(configPath);
  const context = detectProjectContext(projectRoot);
  const rsxBuildConfig = resolveRsxBuildConfig(projectRoot);
  const defaultPreparseEnabled = prodMode
    ? typeof rsxBuildConfig.preparse === 'boolean'
      ? rsxBuildConfig.preparse
      : context === 'angular'
    : context === 'angular';
  const defaultCompiledEnabled = prodMode
    ? typeof rsxBuildConfig.compiled === 'boolean'
      ? rsxBuildConfig.compiled
      : true
    : false;
  const aotPreparseEnabled = parseBooleanFlag(
    flags['aot-preparse'],
    defaultPreparseEnabled,
  );
  const aotCompiledEnabled = parseBooleanFlag(
    flags['aot-compiled'],
    defaultCompiledEnabled,
  );
  const aotPreparseFile =
    typeof flags['aot-preparse-file'] === 'string'
      ? path.resolve(projectRoot, flags['aot-preparse-file'])
      : typeof rsxBuildConfig.preparseFile === 'string'
        ? path.resolve(projectRoot, rsxBuildConfig.preparseFile)
        : context === 'angular'
          ? path.join(projectRoot, 'src', 'rsx-aot-preparsed.generated.ts')
          : null;
  const aotCompiledFile =
    typeof flags['aot-compiled-file'] === 'string'
      ? path.resolve(projectRoot, flags['aot-compiled-file'])
      : typeof rsxBuildConfig.compiledFile === 'string'
        ? path.resolve(projectRoot, rsxBuildConfig.compiledFile)
        : context === 'angular'
          ? path.join(projectRoot, 'src', 'rsx-aot-compiled.generated.ts')
          : null;
  const aotRegistrationFile =
    typeof rsxBuildConfig.registrationFile === 'string'
      ? path.resolve(projectRoot, rsxBuildConfig.registrationFile)
      : context === 'angular'
        ? path.join(projectRoot, 'src', 'rsx-aot-registration.generated.ts')
        : null;
  const includeResolvedEvaluator = parseBooleanFlag(
    flags['compiled-resolved-evaluator'],
    Boolean(rsxBuildConfig.compiledResolvedEvaluator),
  );

  if (!fs.existsSync(configPath)) {
    logError(`TypeScript config not found: ${configPath}`);
    process.exit(1);
  }

  const ts = resolveProjectModule(projectRoot, 'typescript');
  if (!ts) {
    logError('Missing `typescript` in this project.');
    logInfo('Install it with: npm i -D typescript');
    process.exit(1);
  }

  const readConfig = ts.readConfigFile(configPath, ts.sys.readFile);
  if (readConfig.error) {
    const formatted = ts.formatDiagnosticsWithColorAndContext(
      [readConfig.error],
      {
        getCanonicalFileName: (name) => name,
        getCurrentDirectory: () => projectRoot,
        getNewLine: () => '\n',
      },
    );
    console.error(formatted);
    process.exit(1);
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    readConfig.config,
    ts.sys,
    path.dirname(configPath),
    undefined,
    configPath,
  );
  if (parsedConfig.errors.length > 0) {
    const formatted = ts.formatDiagnosticsWithColorAndContext(
      parsedConfig.errors,
      {
        getCanonicalFileName: (name) => name,
        getCurrentDirectory: () => projectRoot,
        getNewLine: () => '\n',
      },
    );
    console.error(formatted);
    process.exit(1);
  }

  const outDirOverride =
    typeof flags['out-dir'] === 'string'
      ? path.resolve(projectRoot, flags['out-dir'])
      : null;
  const outDir =
    outDirOverride ??
    parsedConfig.options.outDir ??
    path.join(projectRoot, 'dist');
  const compilerOptions = {
    ...parsedConfig.options,
    outDir,
  };

  const program = ts.createProgram({
    rootNames: parsedConfig.fileNames,
    options: compilerOptions,
  });
  const ignoredGeneratedFiles = new Set(
    [aotPreparseFile, aotCompiledFile]
      .filter((filePath) => typeof filePath === 'string')
      .map((filePath) => path.resolve(filePath)),
  );

  let blockingDiagnostics = [];
  try {
    const preEmitDiagnostics = ts.getPreEmitDiagnostics(program);
    blockingDiagnostics = preEmitDiagnostics.filter((diagnostic) => {
      if (diagnostic.category !== ts.DiagnosticCategory.Error) {
        return false;
      }
      const diagnosticFilePath = diagnostic.file?.fileName
        ? path.resolve(diagnostic.file.fileName)
        : null;
      if (diagnosticFilePath && ignoredGeneratedFiles.has(diagnosticFilePath)) {
        return false;
      }
      return true;
    });
  } catch (error) {
    if (
      error instanceof RangeError &&
      String(error.message).includes('Maximum call stack size exceeded')
    ) {
      logWarn(
        'TypeScript pre-emit diagnostics overflowed (TS internal recursion). Continuing with RS-X semantic validation.',
      );
    } else {
      throw error;
    }
  }

  if (blockingDiagnostics.length > 0) {
    const formatted = ts.formatDiagnosticsWithColorAndContext(
      blockingDiagnostics,
      {
        getCanonicalFileName: (name) => name,
        getCurrentDirectory: () => projectRoot,
        getNewLine: () => '\n',
      },
    );
    console.error(formatted);
    process.exit(1);
  }

  const compilerModule = resolveRsxCompilerModule(projectRoot);
  runRsxSemanticValidation(program, projectRoot, compilerModule);
  runRsxAotPreparseGeneration({
    program,
    projectRoot,
    compilerModule,
    enabled: aotPreparseEnabled,
    outputFile: aotPreparseFile,
    dryRun,
  });
  runRsxAotCompiledGeneration({
    program,
    projectRoot,
    compilerModule,
    enabled: aotCompiledEnabled,
    outputFile: aotCompiledFile,
    includeResolvedEvaluator,
    dryRun,
  });
  runRsxAngularAotRegistrationInjection({
    context,
    projectRoot,
    configPath,
    registrationFile: aotRegistrationFile,
    preparseEnabled: aotPreparseEnabled,
    preparseFile: aotPreparseFile,
    compiledEnabled: aotCompiledEnabled,
    compiledFile: aotCompiledFile,
    dryRun,
  });

  if (dryRun) {
    logInfo(`[dry-run] rsx build using ${configPath}`);
    logInfo(`[dry-run] source files: ${parsedConfig.fileNames.length}`);
    logInfo(`[dry-run] outDir: ${outDir}`);
    logInfo(`[dry-run] prod mode: ${prodMode ? 'on' : 'off'}`);
    if (noEmit) {
      logInfo('[dry-run] no-emit mode enabled');
    }
    return;
  }

  if (noEmit) {
    logOk('Typecheck completed. No TypeScript or RS-X semantic errors found.');
    return;
  }

  try {
    const emitResult = program.emit();
    if (emitResult.emitSkipped) {
      logError('Build failed: TypeScript emit skipped.');
      process.exit(1);
    }

    logOk(`Build completed. Output: ${outDir}`);
    return;
  } catch (error) {
    logWarn('TypeScript emit failed; falling back to transpile pipeline.');
    if (error instanceof Error) {
      logWarn(error.message);
    }
  }

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const commonSourceDirectory =
    compilerOptions.rootDir ??
    program.getCommonSourceDirectory() ??
    projectRoot;
  const sourceFiles = program
    .getSourceFiles()
    .filter((sourceFile) => !sourceFile.isDeclarationFile)
    .filter((sourceFile) =>
      parsedConfig.fileNames.includes(sourceFile.fileName),
    );

  for (const sourceFile of sourceFiles) {
    const sourceText = ts
      .createPrinter({ newLine: ts.NewLineKind.LineFeed })
      .printFile(sourceFile);

    const transpiled = ts.transpileModule(sourceText, {
      compilerOptions,
      fileName: sourceFile.fileName,
    });

    const relativePath = path.relative(
      commonSourceDirectory,
      sourceFile.fileName,
    );
    const outputPath = path
      .join(outDir, relativePath)
      .replace(/\.[cm]?[jt]sx?$/u, '.js');

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, transpiled.outputText, 'utf8');
  }

  logOk(`Build completed via transpile fallback. Output: ${outDir}`);
}

function runTypecheck(flags) {
  runBuild({
    ...flags,
    'no-emit': true,
  });
}

function resolveRsxCompilerModule(projectRoot) {
  let compilerModule = resolveProjectModule(projectRoot, '@rs-x/compiler');
  if (compilerModule) {
    return compilerModule;
  }

  const repoRoot = findRepoRoot(projectRoot);
  const localCompilerPath = repoRoot
    ? path.join(repoRoot, 'rs-x-compiler', 'dist', 'index.cjs')
    : null;
  if (localCompilerPath && fs.existsSync(localCompilerPath)) {
    return require(localCompilerPath);
  }

  return null;
}

function runRsxSemanticValidation(program, projectRoot, compilerModule) {
  if (
    !compilerModule ||
    typeof compilerModule.validateExpressionSites !== 'function'
  ) {
    logError('Missing `@rs-x/compiler` in this project.');
    logInfo('Install it with: npm i -D @rs-x/compiler');
    process.exit(1);
  }

  const validatedSites = compilerModule.validateExpressionSites(program);
  const rsxDiagnostics = validatedSites.flatMap((site) =>
    site.diagnostics.map((diagnostic) => ({
      diagnostic,
      site,
    })),
  );

  if (rsxDiagnostics.length === 0) {
    return;
  }

  const formatted = rsxDiagnostics
    .map(({ diagnostic, site }) => {
      const sourceFile = site.sourceFile;
      const absolutePath = sourceFile.fileName;
      const relativePath =
        path.relative(projectRoot, absolutePath) || absolutePath;
      const expressionStart = site.expressionLiteral.getStart(sourceFile) + 1;
      const location =
        sourceFile.getLineAndCharacterOfPosition(expressionStart);
      const category = diagnostic.category === 'syntax' ? 'RSX1001' : 'RSX1000';
      return `${relativePath}:${location.line + 1}:${location.character + 1} - error ${category}: ${diagnostic.message}\n  expression: ${site.expression}`;
    })
    .join('\n\n');

  console.error('');
  logError(
    `RS-X semantic validation failed with ${rsxDiagnostics.length} error(s).`,
  );
  console.error(formatted);
  process.exit(1);
}

function runRsxAotPreparseGeneration({
  program,
  projectRoot,
  compilerModule,
  enabled,
  outputFile,
  dryRun,
}) {
  if (!enabled || !outputFile) {
    return;
  }

  if (
    !compilerModule ||
    typeof compilerModule.generateAotParsedExpressionCacheModule !== 'function'
  ) {
    logWarn(
      'Skipping RS-X preparse generation: compiler does not expose generateAotParsedExpressionCacheModule.',
    );
    return;
  }

  const generated =
    compilerModule.generateAotParsedExpressionCacheModule(program);
  const header = [
    '// @ts-nocheck',
    '/* eslint-disable */',
    '/* This file is auto-generated by rsx build. Do not edit manually. */',
    '',
  ].join('\n');
  const content = `${header}${generated.code}`;

  if (dryRun) {
    logInfo(
      `[dry-run] generate RS-X preparse cache (${generated.expressions.length} expressions): ${outputFile}`,
    );
    return;
  }

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, content, 'utf8');
  logOk(
    `Generated RS-X preparse cache (${generated.expressions.length} expressions): ${path.relative(projectRoot, outputFile)}`,
  );
}

function runRsxAotCompiledGeneration({
  program,
  projectRoot,
  compilerModule,
  enabled,
  outputFile,
  includeResolvedEvaluator,
  dryRun,
}) {
  if (!enabled || !outputFile) {
    return;
  }

  if (
    !compilerModule ||
    typeof compilerModule.generateAotCompiledExpressionsModule !== 'function'
  ) {
    logWarn(
      'Skipping RS-X compiled generation: compiler does not expose generateAotCompiledExpressionsModule.',
    );
    return;
  }

  const generated = compilerModule.generateAotCompiledExpressionsModule(
    program,
    {
      includeResolvedEvaluator,
    },
  );
  const header = [
    '// @ts-nocheck',
    '/* eslint-disable */',
    '/* This file is auto-generated by rsx build. Do not edit manually. */',
    '',
  ].join('\n');
  const content = `${header}${generated.code}`;

  if (dryRun) {
    logInfo(
      `[dry-run] generate RS-X compiled cache (${generated.expressions.length} expressions): ${outputFile}`,
    );
    return;
  }

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, content, 'utf8');
  logOk(
    `Generated RS-X compiled cache (${generated.expressions.length} expressions): ${path.relative(projectRoot, outputFile)}`,
  );
}

function runRsxAngularAotRegistrationInjection({
  context,
  projectRoot,
  configPath,
  registrationFile,
  preparseEnabled,
  preparseFile,
  compiledEnabled,
  compiledFile,
  dryRun,
}) {
  if (context !== 'angular') {
    return;
  }

  if (!registrationFile) {
    return;
  }

  const registrationLines = [
    '// @ts-nocheck',
    '/* eslint-disable */',
    '/* This file is auto-generated by rsx build. Do not edit manually. */',
    '',
  ];

  if (preparseEnabled && preparseFile) {
    const preparseImport = toImportSpecifier(registrationFile, preparseFile);
    registrationLines.push(
      `import { registerRsxAotParsedExpressionCache } from '${preparseImport}';`,
    );
  }

  if (compiledEnabled && compiledFile) {
    const compiledImport = toImportSpecifier(registrationFile, compiledFile);
    registrationLines.push(
      `import { registerRsxAotCompiledExpressions } from '${compiledImport}';`,
    );
  }

  registrationLines.push('');

  if (preparseEnabled && preparseFile) {
    registrationLines.push('registerRsxAotParsedExpressionCache();');
  }
  if (compiledEnabled && compiledFile) {
    registrationLines.push('registerRsxAotCompiledExpressions();');
  }

  registrationLines.push('');

  const registrationContent = `${registrationLines.join('\n')}`;
  if (dryRun) {
    logInfo(
      `[dry-run] generate RS-X Angular AOT registration: ${registrationFile}`,
    );
  } else {
    fs.mkdirSync(path.dirname(registrationFile), { recursive: true });
    fs.writeFileSync(registrationFile, registrationContent, 'utf8');
    logOk(
      `Generated RS-X Angular AOT registration: ${path.relative(projectRoot, registrationFile)}`,
    );
  }

  ensureAngularPolyfillsContainsFile({
    projectRoot,
    configPath,
    filePath: registrationFile,
    dryRun,
  });
}

function toImportSpecifier(fromFile, toFile) {
  const fromDir = path.dirname(fromFile);
  const relativePath = path.relative(fromDir, toFile).replace(/\\/g, '/');
  const withoutExtension = relativePath.replace(/\.[cm]?[jt]sx?$/u, '');
  if (withoutExtension.startsWith('./') || withoutExtension.startsWith('../')) {
    return withoutExtension;
  }
  return `./${withoutExtension}`;
}

function ensureAngularPolyfillsContainsFile({
  projectRoot,
  configPath,
  filePath,
  dryRun,
}) {
  const angularJsonPath = path.join(projectRoot, 'angular.json');
  if (!fs.existsSync(angularJsonPath)) {
    logWarn('angular.json not found. Skipping RS-X AOT runtime injection.');
    return;
  }

  let angularJson;
  try {
    angularJson = JSON.parse(fs.readFileSync(angularJsonPath, 'utf8'));
  } catch {
    logWarn(
      'Failed to parse angular.json. Skipping RS-X AOT runtime injection.',
    );
    return;
  }

  const projects = angularJson.projects ?? {};
  const entries = Object.entries(projects);
  if (entries.length === 0) {
    return;
  }

  const normalizedConfigPath = path.resolve(configPath);
  const targetEntries = entries.filter(([, projectConfig]) => {
    const tsConfigPath = projectConfig?.architect?.build?.options?.tsConfig;
    if (typeof tsConfigPath !== 'string') {
      return false;
    }
    return path.resolve(projectRoot, tsConfigPath) === normalizedConfigPath;
  });

  const selectedEntries = targetEntries.length > 0 ? targetEntries : entries;
  const polyfillsPath = path
    .relative(projectRoot, filePath)
    .replace(/\\/g, '/');

  let changed = false;
  const isRsxAotRegistrationEntry = (entry) =>
    typeof entry === 'string' &&
    entry.replace(/\\/g, '/').endsWith('rsx-aot-registration.generated.ts');

  for (const [, projectConfig] of selectedEntries) {
    const buildOptions = projectConfig?.architect?.build?.options;
    if (!buildOptions || typeof buildOptions !== 'object') {
      continue;
    }

    const currentPolyfills = buildOptions.polyfills;
    if (typeof currentPolyfills === 'string') {
      if (currentPolyfills === polyfillsPath) {
        continue;
      }
      if (isRsxAotRegistrationEntry(currentPolyfills)) {
        buildOptions.polyfills = [polyfillsPath];
        changed = true;
        continue;
      }
      buildOptions.polyfills = [currentPolyfills, polyfillsPath];
      changed = true;
      continue;
    }

    if (Array.isArray(currentPolyfills)) {
      const filtered = currentPolyfills.filter(
        (entry) => !isRsxAotRegistrationEntry(entry),
      );
      const hasTarget = filtered.includes(polyfillsPath);
      const nextPolyfills = hasTarget ? filtered : [...filtered, polyfillsPath];

      if (
        nextPolyfills.length !== currentPolyfills.length ||
        nextPolyfills.some((entry, index) => entry !== currentPolyfills[index])
      ) {
        buildOptions.polyfills = nextPolyfills;
        changed = true;
      }
      continue;
    }

    buildOptions.polyfills = [polyfillsPath];
    changed = true;
  }

  if (!changed) {
    return;
  }

  if (dryRun) {
    logInfo(
      `[dry-run] update angular.json build.options.polyfills with ${polyfillsPath}`,
    );
    return;
  }

  fs.writeFileSync(
    angularJsonPath,
    `${JSON.stringify(angularJson, null, 2)}\n`,
  );
  logOk(`Updated angular.json to inject RS-X AOT runtime registration.`);
}

function resolveRsxBuildConfig(projectRoot) {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return {};
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const rsxConfig = packageJson.rsx ?? {};
    const buildConfig = rsxConfig.build ?? {};
    return typeof buildConfig === 'object' && buildConfig ? buildConfig : {};
  } catch {
    return {};
  }
}

function parseBooleanFlag(value, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }
  if (value === true) {
    return true;
  }
  if (typeof value !== 'string') {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (
    normalized === 'true' ||
    normalized === '1' ||
    normalized === 'yes' ||
    normalized === 'on'
  ) {
    return true;
  }
  if (
    normalized === 'false' ||
    normalized === '0' ||
    normalized === 'no' ||
    normalized === 'off'
  ) {
    return false;
  }
  return defaultValue;
}

function printHelp() {
  printGeneralHelp();
}

function printGeneralHelp() {
  console.log(`rsx v${CLI_VERSION}`);
  console.log('');
  console.log('Usage:');
  console.log('  rsx <command> [options]');
  console.log('  rsx help [command]');
  console.log('');
  console.log('Commands:');
  console.log('  doctor                  Run environment checks');
  console.log('  add | -a | -add         Interactive expression scaffolder');
  console.log('  install vscode          Install VS Code extension');
  console.log('  install compiler        Install compiler tooling packages');
  console.log(
    '  setup                   Install RS-X tooling (or setup framework integration)',
  );
  console.log('  init                    Setup packages and bootstrap wiring');
  console.log(
    '  project                 Create RS-X starter project (angular/vuejs/react/nextjs/nodejs)',
  );
  console.log('  build                   Build project with RS-X transform');
  console.log(
    '  typecheck               Type-check project + RS-X semantic checks',
  );
  console.log('  version | -v            Print CLI version');
  console.log('');
  console.log('Help Aliases:');
  console.log('  rsx -h');
  console.log('  rsx -help');
  console.log('  rsx --help');
  console.log('');
  console.log('Examples:');
  console.log('  rsx help init');
  console.log('  rsx help project');
  console.log('  rsx install vscode --help');
  console.log('  rsx add');
}

function printDoctorHelp() {
  console.log('Usage:');
  console.log('  rsx doctor');
  console.log('');
  console.log('Checks:');
  console.log('  - Node.js >= 20');
  console.log('  - VS Code CLI (code)');
  console.log('  - Package manager (pnpm/npm/yarn/bun)');
}

function printAddHelp() {
  console.log('Usage:');
  console.log('  rsx add');
  console.log('  rsx -a');
  console.log('  rsx -add');
  console.log('');
  console.log('What it does:');
  console.log(
    '  - Prompts for expression export name (must be valid TS identifier)',
  );
  console.log(
    '  - Prompts whether file name should be kebab-case (default: yes)',
  );
  console.log('  - Prompts for output directory (relative or absolute)');
  console.log('  - Prompts whether to reuse an existing model file');
  console.log('  - Creates <name>.ts and optionally creates <name>.model.ts');
  console.log(
    '  - Expression file imports selected model and exports rsx expression',
  );
}

function printInstallHelp(target) {
  if (target === 'vscode') {
    console.log('Usage:');
    console.log('  rsx install vscode [--force] [--local] [--dry-run]');
    console.log('');
    console.log('Options:');
    console.log('  --force     Reinstall extension if already installed');
    console.log('  --local     Build/install local VSIX from repo workspace');
    console.log('  --dry-run   Print commands without executing them');
    return;
  }

  if (target === 'compiler') {
    console.log('Usage:');
    console.log(
      '  rsx install compiler [--pm <pnpm|npm|yarn|bun>] [--next] [--dry-run]',
    );
    console.log('');
    console.log('Options:');
    console.log('  --pm        Explicit package manager');
    console.log('  --next      Install prerelease versions (dist-tag next)');
    console.log('  --dry-run   Print commands without executing them');
    return;
  }

  console.log('Usage:');
  console.log('  rsx install vscode [--force] [--local] [--dry-run]');
  console.log(
    '  rsx install compiler [--pm <pnpm|npm|yarn|bun>] [--next] [--dry-run]',
  );
}

function printSetupHelp() {
  console.log('Usage:');
  console.log(
    '  rsx setup [--pm <pnpm|npm|yarn|bun>] [--next] [--force] [--local] [--dry-run]',
  );
  console.log('');
  console.log('What it does:');
  console.log(
    '  - Auto-detects framework and applies matching setup flow (react/vuejs/next/angular)',
  );
  console.log('  - Installs runtime packages');
  console.log('  - Installs compiler tooling packages');
  console.log('  - Installs VS Code extension');
  console.log('  - Applies framework-specific transform/build integration');
  console.log('');
  console.log('Options:');
  console.log('  --pm        Explicit package manager');
  console.log('  --next      Install prerelease versions (dist-tag next)');
  console.log('  --force     Reinstall extension if already installed');
  console.log('  --local     Build/install local VSIX from repo workspace');
  console.log('  --dry-run   Print commands without executing them');
}

function printInitHelp() {
  console.log('Usage:');
  console.log(
    '  rsx init [--pm <pnpm|npm|yarn|bun>] [--entry <path>] [--next] [--skip-install] [--skip-vscode] [--force] [--local] [--dry-run]',
  );
  console.log('');
  console.log('What it does:');
  console.log(
    '  - Installs runtime and compiler tooling (unless --skip-install)',
  );
  console.log(
    '  - Detects project context and wires RS-X bootstrap in entry file',
  );
  console.log('  - Installs VS Code extension (unless --skip-vscode)');
  console.log('');
  console.log('Options:');
  console.log('  --pm            Explicit package manager');
  console.log('  --entry         Explicit application entry file');
  console.log('  --next          Install prerelease versions (dist-tag next)');
  console.log('  --skip-install  Skip npm/pnpm/yarn/bun package installation');
  console.log('  --skip-vscode   Skip VS Code extension installation');
  console.log('  --force         Reinstall extension if already installed');
  console.log('  --local         Build/install local VSIX from repo workspace');
  console.log('  --dry-run       Print commands without executing them');
}

function printProjectHelp() {
  console.log('Usage:');
  console.log(
    '  rsx project [angular|vuejs|react|nextjs|nodejs] [--name <project-name>] [--pm <pnpm|npm|yarn|bun>] [--next] [--template <angular|vuejs|react|nextjs|nodejs>] [--tarballs-dir <path>] [--skip-install] [--skip-vscode] [--dry-run]',
  );
  console.log('');
  console.log('What it does:');
  console.log('  - Creates a new project folder');
  console.log('  - Supports templates: angular, vuejs, react, nextjs, nodejs');
  console.log(
    '  - Angular generates the RS-X virtual-table demo starter on top of the latest Angular scaffold',
  );
  console.log('  - Scaffolds framework app and wires RS-X bootstrap/setup');
  console.log('  - Writes package.json with RS-X dependencies');
  console.log(
    '  - Adds tsconfig + TypeScript plugin config for editor support',
  );
  console.log(
    '  - For Angular template: uses the latest Angular CLI scaffold, then applies the RS-X demo starter',
  );
  console.log('  - For React/Next templates: also installs @rs-x/react');
  console.log('  - For Vue template: also installs @rs-x/vue');
  console.log('  - Installs dependencies (unless --skip-install)');
  console.log('');
  console.log('Options:');
  console.log('  --name          Project folder/package name');
  console.log(
    '  --template      Project template (if omitted, asks interactively)',
  );
  console.log('  --pm            Explicit package manager');
  console.log('  --next          Install prerelease versions (dist-tag next)');
  console.log(
    '  --tarballs-dir  Directory containing local RS-X package tarballs (*.tgz)',
  );
  console.log('                  (or set RSX_TARBALLS_DIR env var)');
  console.log('  --skip-install  Skip dependency installation');
  console.log('  --skip-vscode   Skip VS Code extension installation');
  console.log('  --dry-run       Print actions without writing files');
}

function printBuildHelp() {
  console.log('Usage:');
  console.log(
    '  rsx build [--project <path-to-tsconfig>] [--out-dir <path>] [--prod] [--aot-preparse <true|false>] [--aot-preparse-file <path>] [--aot-compiled <true|false>] [--aot-compiled-file <path>] [--compiled-resolved-evaluator <true|false>] [--dry-run]',
  );
  console.log('');
  console.log('What it does:');
  console.log('  - Loads your TypeScript project config');
  console.log(
    '  - Applies RS-X expression cache preload transform during compilation',
  );
  console.log('  - Emits JavaScript output to tsconfig outDir (or --out-dir)');
  console.log('');
  console.log('Options:');
  console.log('  --project   Path to tsconfig file (default: tsconfig.json)');
  console.log('  --out-dir   Override output directory');
  console.log(
    '  --prod              Production profile (enables configured AOT outputs)',
  );
  console.log(
    '  --aot-preparse      Generate RS-X preparse cache module (default: true for Angular projects)',
  );
  console.log(
    '  --aot-preparse-file Output path for generated preparse cache module',
  );
  console.log(
    '  --aot-compiled      Generate RS-X compiled cache module (default: false, true in --prod)',
  );
  console.log(
    '  --aot-compiled-file Output path for generated compiled cache module',
  );
  console.log(
    '  --compiled-resolved-evaluator Include evaluateResolvedDependencies in compiled output',
  );
  console.log('  --no-emit   Type-check only (skip JavaScript emit)');
  console.log('  --dry-run   Print build plan without emitting');
}

function printTypecheckHelp() {
  console.log('Usage:');
  console.log('  rsx typecheck [--project <path-to-tsconfig>] [--dry-run]');
  console.log('');
  console.log('What it does:');
  console.log('  - Loads your TypeScript project config');
  console.log('  - Fails on TypeScript compile errors');
  console.log('  - Fails on RS-X expression semantic errors');
  console.log('  - Does not emit build output');
  console.log('');
  console.log('Options:');
  console.log('  --project   Path to tsconfig file (default: tsconfig.json)');
  console.log('  --dry-run   Print typecheck plan without executing emit');
}

function printVersionHelp() {
  console.log('Usage:');
  console.log('  rsx version');
  console.log('  rsx -v');
  console.log('  rsx -version');
  console.log('  rsx --version');
}

function isHelpToken(value) {
  return value === '-h' || value === '--help' || value === '-help';
}

function isVersionToken(value) {
  return (
    value === '-v' ||
    value === '--version' ||
    value === '-version' ||
    value === 'version'
  );
}

function printHelpFor(command, target) {
  if (
    !command ||
    command === 'help' ||
    command === '--help' ||
    command === '-help' ||
    command === '-h'
  ) {
    printGeneralHelp();
    return;
  }

  if (command === 'doctor') {
    printDoctorHelp();
    return;
  }

  if (command === 'add' || command === '-a' || command === '-add') {
    printAddHelp();
    return;
  }

  if (command === 'install') {
    printInstallHelp(target);
    return;
  }

  if (command === 'setup') {
    printSetupHelp();
    return;
  }

  if (command === 'init') {
    printInitHelp();
    return;
  }

  if (command === 'project') {
    printProjectHelp();
    return;
  }

  if (command === 'build') {
    printBuildHelp();
    return;
  }

  if (command === 'typecheck') {
    printTypecheckHelp();
    return;
  }

  if (
    command === 'version' ||
    command === '-v' ||
    command === '--version' ||
    command === '-version'
  ) {
    printVersionHelp();
    return;
  }

  printGeneralHelp();
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
  const [command, target, third] = positionals;
  const wantsVersion = isVersionToken(command) || flags.version === true;
  const wantsGeneralHelp =
    !command || command === 'help' || isHelpToken(command);
  const wantsCommandHelp = flags.help === true;
  const hasPositionalHelpToken = positionals.some((token, index) => {
    return index > 0 && isHelpToken(token);
  });
  const resolvedHelpTarget = isHelpToken(target) ? third : target;

  if (command === 'help') {
    printHelpFor(target, positionals[2]);
    return;
  }

  if (wantsGeneralHelp) {
    printHelpFor(command, target);
    return;
  }

  if (wantsCommandHelp) {
    printHelpFor(command, target);
    return;
  }

  if (hasPositionalHelpToken) {
    printHelpFor(command, resolvedHelpTarget);
    return;
  }

  if (wantsVersion) {
    console.log(CLI_VERSION);
    return;
  }

  if (command === 'doctor') {
    runDoctor();
    return;
  }

  if (command === 'add' || command === '-a' || command === '-add') {
    runAdd().catch((error) => {
      logError(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
    return;
  }

  if (command === 'install' && target === 'vscode') {
    installVsCodeExtension(flags);
    return;
  }

  if (command === 'install' && target === 'compiler') {
    const pm = detectPackageManager(flags.pm);
    const tag = resolveInstallTag(flags);
    installCompilerPackages(pm, Boolean(flags['dry-run']), tag);
    return;
  }

  if (command === 'setup') {
    if (target) {
      logError(
        'Framework argument is not supported for `rsx setup`. The framework is auto-detected.',
      );
      logInfo('Use: `rsx setup`');
      process.exit(1);
    }
    runSetupAuto(flags);
    return;
  }

  if (command === 'init') {
    runInit(flags);
    return;
  }

  if (command === 'project') {
    const templateFromTarget = normalizeProjectTemplate(target);
    const templateFromFlag = normalizeProjectTemplate(flags.template);
    const nameHint =
      !templateFromTarget && typeof target === 'string' ? target : third;
    const effectiveTemplate = templateFromFlag ?? templateFromTarget ?? null;

    (async () => {
      const chosenTemplate =
        effectiveTemplate ?? (await promptProjectTemplate());
      await runProjectWithTemplate(chosenTemplate, {
        ...flags,
        _nameHint: nameHint,
      });
    })().catch((error) => {
      logError(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
    return;
  }

  if (command === 'build') {
    runBuild(flags);
    return;
  }

  if (command === 'typecheck') {
    runTypecheck(flags);
    return;
  }

  logError(`Unknown command: ${positionals.join(' ')}`);
  printHelp();
  process.exit(1);
}

main();
