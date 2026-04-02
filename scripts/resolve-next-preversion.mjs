#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const preJsonPath = resolve('.changeset', 'pre.json');

const statusRaw = execSync('pnpm changeset status --json', {
  stdio: ['ignore', 'pipe', 'inherit'],
  encoding: 'utf8',
});
const status = JSON.parse(statusRaw);

const releases = Array.isArray(status.releases) ? status.releases : [];
if (releases.length === 0) {
  console.log(
    'No releases found in changeset status. Skipping preVersion set.',
  );
  process.exit(0);
}

const coreRelease = releases.find((release) => release.name === '@rs-x/core');
const targetRelease = coreRelease ?? releases[0];
const targetVersion = targetRelease.newVersion;

if (typeof targetVersion !== 'string' || targetVersion.length === 0) {
  throw new Error('Failed to resolve target version for prerelease.');
}

const npmVersionsRaw = execSync('npm view @rs-x/core versions --json', {
  stdio: ['ignore', 'pipe', 'inherit'],
  encoding: 'utf8',
});
const npmVersions = JSON.parse(npmVersionsRaw);
const versionList = Array.isArray(npmVersions) ? npmVersions : [];

const prereleasePattern = new RegExp(`^${targetVersion}-next\\.(\\d+)$`);
let maxPreVersion = -1;

for (const version of versionList) {
  if (typeof version !== 'string') {
    continue;
  }
  const match = prereleasePattern.exec(version);
  if (!match) {
    continue;
  }
  const value = Number.parseInt(match[1], 10);
  if (Number.isInteger(value) && value > maxPreVersion) {
    maxPreVersion = value;
  }
}

const nextPreVersion = maxPreVersion + 1;
const preJsonRaw = readFileSync(preJsonPath, 'utf8');
const preJson = JSON.parse(preJsonRaw);
const currentPreVersion =
  typeof preJson.preVersion === 'number' ? preJson.preVersion : 0;

const resolvedPreVersion = Math.max(currentPreVersion, nextPreVersion);
preJson.preVersion = resolvedPreVersion;

writeFileSync(preJsonPath, `${JSON.stringify(preJson, null, 2)}\n`, 'utf8');
console.log(
  `Resolved preVersion: ${resolvedPreVersion} (base ${targetVersion})`,
);
