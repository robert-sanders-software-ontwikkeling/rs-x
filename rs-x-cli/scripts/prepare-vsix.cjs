#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const cliRoot = path.resolve(__dirname, '..');
const extensionDistDir = path.resolve(
  cliRoot,
  '..',
  'rs-x-vscode-extension',
  'dist',
);

function findLatestVsix(distDir) {
  if (!fs.existsSync(distDir)) {
    return null;
  }

  const files = fs
    .readdirSync(distDir)
    .filter((name) => /^rs-x-vscode-extension-.*\.vsix$/u.test(name))
    .map((name) => {
      const fullPath = path.join(distDir, name);
      const stat = fs.statSync(fullPath);
      return { name, fullPath, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return files[0] ?? null;
}

function cleanupExistingVsixInCli() {
  const entries = fs
    .readdirSync(cliRoot)
    .filter((name) => /^rs-x-vscode-extension-.*\.vsix$/u.test(name));

  for (const fileName of entries) {
    fs.rmSync(path.join(cliRoot, fileName), { force: true });
  }
}

function main() {
  const latestVsix = findLatestVsix(extensionDistDir);

  cleanupExistingVsixInCli();

  if (!latestVsix) {
    console.warn(
      `[rs-x-cli] No VSIX found in ${extensionDistDir}. Continuing without bundling a local extension package.`,
    );
    return;
  }

  const targetPath = path.join(cliRoot, latestVsix.name);
  fs.copyFileSync(latestVsix.fullPath, targetPath);
  console.log(`[rs-x-cli] Bundled VSIX: ${latestVsix.name}`);
}

main();
