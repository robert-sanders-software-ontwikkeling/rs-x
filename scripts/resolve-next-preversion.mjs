#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const preJsonPath = resolve('.changeset', 'pre.json');
const changesetDir = resolve('.changeset');
const bumpRank = { patch: 0, minor: 1, major: 2 };

function parseChangesetBumps() {
  const files = readdirSync(changesetDir).filter(
    (name) =>
      name.endsWith('.md') &&
      name !== 'README.md' &&
      name !== 'pre.json' &&
      name !== 'config.json',
  );

  const bumps = new Map();

  for (const file of files) {
    const content = readFileSync(resolve(changesetDir, file), 'utf8');
    const sections = content.split('---');
    if (sections.length < 3) {
      continue;
    }
    const frontmatter = sections[1] ?? '';
    for (const line of frontmatter.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      const match = trimmed.match(
        /^["']?([^"']+)["']?:\s*(major|minor|patch)$/,
      );
      if (!match) {
        continue;
      }
      const name = match[1];
      const bump = match[2];
      const existing = bumps.get(name);
      if (!existing || bumpRank[bump] > bumpRank[existing]) {
        bumps.set(name, bump);
      }
    }
  }

  return bumps;
}

function bumpVersion(version, bump) {
  const [major, minor, patch] = version
    .split('.')
    .map((value) => Number(value));
  if (![major, minor, patch].every((value) => Number.isInteger(value))) {
    throw new Error(`Invalid version: ${version}`);
  }
  if (bump === 'major') {
    return `${major + 1}.0.0`;
  }
  if (bump === 'minor') {
    return `${major}.${minor + 1}.0`;
  }
  return `${major}.${minor}.${patch + 1}`;
}

const bumps = parseChangesetBumps();
const corePackage = JSON.parse(
  readFileSync(resolve('rs-x-core', 'package.json'), 'utf8'),
);
const currentVersion = corePackage.version;
const bump = bumps.get('@rs-x/core') ?? 'patch';
const targetVersion = bumpVersion(currentVersion, bump);

let nextPreVersion = 0;

try {
  const distTagsRaw = execSync('npm view @rs-x/core dist-tags --json', {
    stdio: ['ignore', 'pipe', 'inherit'],
    encoding: 'utf8',
  });
  const distTags = JSON.parse(distTagsRaw);
  if (distTags && typeof distTags.next === 'string') {
    const match = distTags.next.match(
      new RegExp(`^${targetVersion}-next\\.(\\d+)$`),
    );
    if (match) {
      nextPreVersion = Number.parseInt(match[1], 10) + 1;
    }
  }
} catch {
  // ignore and fall back to full versions list
}

if (nextPreVersion === 0) {
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

  nextPreVersion = maxPreVersion + 1;
}
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
