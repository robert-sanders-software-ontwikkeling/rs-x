#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const packageEntries = [
  'rs-x-core',
  'rs-x-state-manager',
  'rs-x-expression-parser',
  'rs-x-compiler',
  'rs-x-typescript-plugin',
  'rs-x-cli',
  'rs-x-angular/projects/rsx',
  'rs-x-react',
  'rs-x-react-components',
  'rs-x-vue',
  'rs-x-dev-tools',
  'rs-x-expression-editor',
  'rs-x-site',
  'rs-x-vscode-extension',
];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function npmVersionExists(pkgName, version) {
  try {
    execSync(`npm view ${pkgName}@${version} version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function resolveNextPreVersion(baseVersion, currentPreVersion) {
  let nextPreVersion = currentPreVersion + 1;

  try {
    const distTagsRaw = execSync('npm view @rs-x/core dist-tags --json', {
      stdio: ['ignore', 'pipe', 'inherit'],
      encoding: 'utf8',
    });
    const distTags = JSON.parse(distTagsRaw);
    if (distTags && typeof distTags.next === 'string') {
      const match = distTags.next.match(
        new RegExp(`^${baseVersion}-next\\.(\\d+)$`),
      );
      if (match) {
        nextPreVersion = Math.max(
          nextPreVersion,
          Number.parseInt(match[1], 10) + 1,
        );
      }
    }
  } catch {
    // ignore and fall back to versions list
  }

  try {
    const versionsRaw = execSync('npm view @rs-x/core versions --json', {
      stdio: ['ignore', 'pipe', 'inherit'],
      encoding: 'utf8',
    });
    const versions = JSON.parse(versionsRaw);
    if (Array.isArray(versions)) {
      const pattern = new RegExp(`^${baseVersion}-next\\.(\\d+)$`);
      let maxSeen = -1;
      for (const version of versions) {
        if (typeof version !== 'string') {
          continue;
        }
        const match = pattern.exec(version);
        if (!match) {
          continue;
        }
        const value = Number.parseInt(match[1], 10);
        if (Number.isInteger(value) && value > maxSeen) {
          maxSeen = value;
        }
      }
      if (maxSeen >= 0) {
        nextPreVersion = Math.max(nextPreVersion, maxSeen + 1);
      }
    }
  } catch {
    // ignore if versions list is unavailable
  }

  return nextPreVersion;
}

const corePackagePath = resolve('rs-x-core', 'package.json');
const corePackage = readJson(corePackagePath);
const currentVersion = corePackage.version;
const prereleaseMatch = currentVersion.match(/^(\d+\.\d+\.\d+)-next\.(\d+)$/);

if (!prereleaseMatch) {
  console.log('No next prerelease detected; skipping bump.');
  process.exit(0);
}

const baseVersion = prereleaseMatch[1];
const currentPreVersion = Number.parseInt(prereleaseMatch[2], 10);
if (!npmVersionExists('@rs-x/core', currentVersion)) {
  console.log(
    `Current prerelease ${currentVersion} not published; no bump needed.`,
  );
  process.exit(0);
}

const nextPreVersion = resolveNextPreVersion(baseVersion, currentPreVersion);
const nextVersion = `${baseVersion}-next.${nextPreVersion}`;

if (nextVersion === currentVersion) {
  console.log(`PreVersion already resolved to ${nextVersion}.`);
  process.exit(0);
}

for (const entry of packageEntries) {
  const packageJsonPath = resolve(entry, 'package.json');
  const pkg = readJson(packageJsonPath);
  if (pkg.version === currentVersion) {
    pkg.version = nextVersion;
    writeJson(packageJsonPath, pkg);
  }

  const changelogPath = resolve(entry, 'CHANGELOG.md');
  try {
    const changelog = readFileSync(changelogPath, 'utf8');
    const updated = changelog.replace(
      new RegExp(`^## ${currentVersion}\\b`, 'm'),
      `## ${nextVersion}`,
    );
    if (updated !== changelog) {
      writeFileSync(changelogPath, updated, 'utf8');
    }
  } catch {
    // ignore missing changelog
  }
}

console.log(`Bumped prerelease version: ${currentVersion} → ${nextVersion}`);
