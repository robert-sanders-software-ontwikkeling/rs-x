#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'fs';
import path from 'path';

const DIST_TAG = process.env.DIST_TAG || 'latest';

const angularDist = 'rs-x-angular/dist/rsx';
// Node package folders (relative to repo root)
const nodePackageFolders = ['rs-x-core', 'rs-x-state-manager', 'rs-x-expression-parser', angularDist];


function run(cmd, options = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...options });
}

function patchAngularPackage() {
  const pkgJsonPath = path.join(angularDist, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    console.error('Angular dist folder not found:', angularDist);
    process.exit(1);
  }

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));

  // Use actual published Node package versions
  const coreVersion = JSON.parse(
    execSync('pnpm info @rs-x/core version --json').toString()
  );
  const expVersion = JSON.parse(
    execSync('pnpm info @rs-x/expression-parser version --json').toString()
  );

  pkgJson.peerDependencies['@rs-x/core'] = coreVersion;
  pkgJson.peerDependencies['@rs-x/expression-parser'] = expVersion;

  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
  console.log('Patched Angular package.json with actual published versions');
}

console.log('=== Patching Angular package.json ===');
patchAngularPackage();

// ---------------- DRY-RUN PRE-CHECK ----------------
console.log('=== Pre-flight dry-run check ===');
for (const folder of [...nodePackageFolders]) {
  run(`pnpm publish ${folder} --dry-run --tag ${DIST_TAG}`);
}
console.log('Dry-run succeeded → all packages ready for publishing');

// ---------------- REAL PUBLISH ----------------
console.log('=== Publishing Node packages ===');
for (const folder of nodePackageFolders) {
  console.log(`=== Publishing ${folder} ===`);
  run(`pnpm publish ${folder} --tag ${DIST_TAG} --access public --no-git-checks`);
}


console.log('=== All packages published successfully! ===');