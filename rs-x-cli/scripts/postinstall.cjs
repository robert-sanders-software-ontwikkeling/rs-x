#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function getSpawnOptions(baseOptions = {}) {
  if (process.platform !== 'win32') {
    return baseOptions;
  }

  return {
    ...baseOptions,
    shell: true,
    windowsVerbatimArguments: false,
  };
}

function runCapture(command, args) {
  return spawnSync(
    command,
    args,
    getSpawnOptions({
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    }),
  );
}

function getVsCodeCliCandidates() {
  if (process.platform !== 'win32') {
    return ['code'];
  }

  const candidates = ['code.cmd', 'code'];
  const {
    LOCALAPPDATA,
    ProgramFiles,
    'ProgramFiles(x86)': programFilesX86,
  } = process.env;

  const windowsInstallRoots = [
    LOCALAPPDATA
      ? path.join(LOCALAPPDATA, 'Programs', 'Microsoft VS Code')
      : null,
    ProgramFiles ? path.join(ProgramFiles, 'Microsoft VS Code') : null,
    programFilesX86 ? path.join(programFilesX86, 'Microsoft VS Code') : null,
  ].filter(Boolean);

  for (const installRoot of windowsInstallRoots) {
    candidates.push(path.join(installRoot, 'bin', 'code.cmd'));
    candidates.push(path.join(installRoot, 'bin', 'code'));
  }

  return [...new Set(candidates)];
}

function resolveVsCodeCliCommand() {
  for (const command of getVsCodeCliCandidates()) {
    const result = runCapture(command, ['--version']);
    const hasCliOutput =
      typeof result.stdout === 'string' && result.stdout.trim().length > 0;
    if (!result.error && result.status === 0 && hasCliOutput) {
      return command;
    }
  }

  return null;
}

function shouldSkipInstall() {
  if (process.env.CI === 'true') {
    return true;
  }
  if (process.env.RSX_SKIP_VSCODE_EXTENSION_INSTALL === 'true') {
    return true;
  }
  return false;
}

function installVsCodeExtension() {
  if (shouldSkipInstall()) {
    console.log(
      '[rs-x] Skipping VS Code extension auto-install (CI or RSX_SKIP_VSCODE_EXTENSION_INSTALL=true).',
    );
    return;
  }

  const vsCodeCli = resolveVsCodeCliCommand();
  if (!vsCodeCli) {
    console.log(
      '[rs-x] VS Code CLI (`code`) not found. Checked PATH and standard Windows VS Code install locations. Skipping VS Code extension install.',
    );
    if (process.platform === 'win32') {
      console.log(
        '[rs-x] On Windows, make sure VS Code is installed in the default location or add its `bin` folder to PATH.',
      );
    }
    return;
  }

  const localVsix = resolveBundledVsix();
  if (!localVsix) {
    console.log(
      '[rs-x] No bundled VSIX found in @rs-x/cli package. Skipping VS Code extension install.',
    );
    return;
  }

  const args = ['--install-extension', localVsix];

  const result = spawnSync(
    vsCodeCli,
    args,
    getSpawnOptions({
      stdio: 'inherit',
    }),
  );

  if (result.error || result.status !== 0) {
    console.log(
      '[rs-x] Could not auto-install bundled VSIX. You can install manually:',
    );
    console.log(`       ${vsCodeCli} --install-extension "${localVsix}"`);
    return;
  }

  console.log(`[rs-x] Installed bundled VSIX: ${path.basename(localVsix)}`);
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

installVsCodeExtension();
