#!/usr/bin/env node
import { execSync } from 'node:child_process';

// Use workflow inputs or defaults
const DIST_TAG_NEXT = process.env.DIST_TAG_NEXT || 'next';
const DIST_TAG_LATEST = process.env.DIST_TAG_LATEST || 'latest';

// List of packages to promote
const PACKAGES = [
  '@rs-x/core',
  '@rs-x/state-manager',
  '@rs-x/expression-parser',
  '@rs-x/angular',
];

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

for (const pkg of PACKAGES) {
  let nextVersion;
  let latestVersion;

  try {
    nextVersion = JSON.parse(
      execSync(
        `pnpm info ${pkg} version --json --tag ${DIST_TAG_NEXT}`,
      ).toString(),
    );
  } catch {
    console.log(
      `⚠️  ${pkg} has no version under tag '${DIST_TAG_NEXT}' → skipping`,
    );
    continue;
  }

  try {
    latestVersion = JSON.parse(
      execSync(
        `pnpm info ${pkg} version --json --tag ${DIST_TAG_LATEST}`,
      ).toString(),
    );
  } catch {
    latestVersion = null; // no latest version yet
  }

  if (nextVersion === latestVersion) {
    console.log(`✅ ${pkg} ${nextVersion} is already latest → skipping`);
    continue;
  }

  console.log(`🚀 Promoting ${pkg} ${nextVersion} → ${DIST_TAG_LATEST}`);
  run(`pnpm dist-tag add ${pkg}@${nextVersion} ${DIST_TAG_LATEST}`);
}

console.log('✅ Promotion complete!');
