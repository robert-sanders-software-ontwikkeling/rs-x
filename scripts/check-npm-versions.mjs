#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

// Map npm package names to local folder names
const packageMap = {
  '@rs-x/core': 'rs-x-core',
  '@rs-x/state-manager': 'rs-x-state-manager',
  '@rs-x/expression-parser': 'rs-x-expression-parser',
  '@rs-x/angular': 'rs-x-angular',
};

const basePath = './packages'; // adjust if your packages are elsewhere

let hasConflict = false;

for (const [pkgName, folderName] of Object.entries(packageMap)) {
  const pkgJsonPath = join(basePath, folderName, 'package.json');

  try {
    const pkgJsonRaw = await readFile(pkgJsonPath, 'utf-8');
    const pkgJson = JSON.parse(pkgJsonRaw);
    const version = pkgJson.version;

    try {
      // Check if version exists on npm
      execSync(`npm view ${pkgName}@${version}`, { stdio: 'ignore' });
      console.error(`❌ Version already published: ${pkgName}@${version}`);
      hasConflict = true;
    } catch {
      console.log(`✅ OK: ${pkgName}@${version} not published yet`);
    }
  } catch (err) {
    console.error(`❌ Failed to read package.json for ${folderName}: ${err.message}`);
    hasConflict = true;
  }
}

if (hasConflict) {
  console.error('Aborting: One or more package versions already exist or failed to read.');
  process.exit(1);
} else {
  console.log('All package versions are safe to publish.');
}