#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'fs';
import path from 'path';

const DIST_TAG = process.env.DIST_TAG || 'latest';
const NODE_AUTH_TOKEN = process.env.NODE_AUTH_TOKEN;

const angularDist = 'rs-x-angular/dist/rsx';
const nodePackageFolders = ['rs-x-core', 'rs-x-state-manager', 'rs-x-expression-parser', angularDist];

// ---------------- UTILITIES ----------------
function run(cmd, envOverrides = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...envOverrides } });
}

function getLocalPackageVersion(folder) {
  const pkgJsonPath = path.join(folder, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    console.error(`Package folder not found: ${folder}`);
    process.exit(1);
  }
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
  return pkgJson.version;
}

function pnpmInfoExists(pkgName) {
  try {
    execSync(`pnpm info ${pkgName}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// ---------------- PATCH ANGULAR ----------------
function patchAngularPackage() {
  console.log('=== Patching Angular package.json ===');
  const pkgJsonPath = path.join(angularDist, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    console.error('Angular dist folder not found:', angularDist);
    process.exit(1);
  }

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
  pkgJson.peerDependencies['@rs-x/core'] = getLocalPackageVersion('rs-x-core');
  pkgJson.peerDependencies['@rs-x/expression-parser'] = getLocalPackageVersion('rs-x-expression-parser');

  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
  console.log('Patched Angular package.json with local Node package versions');
}

// ---------------- PUBLISH LOGIC ----------------
function publishFolder(folder, pkgName) {
  const firstPublish = !pnpmInfoExists(pkgName);

  if (firstPublish && !NODE_AUTH_TOKEN) {
    console.error(`Error: NODE_AUTH_TOKEN missing for first-time publish of ${pkgName}`);
    process.exit(1);
  }

  if (firstPublish) {
    console.log(`🚀 First-time publish of ${pkgName}`);
    // Pass NODE_AUTH_TOKEN for first-time publish
    run(`pnpm publish ${folder} --tag ${DIST_TAG} --access public --no-git-checks`, {
      NODE_AUTH_TOKEN
    });
  } else {
    console.log(`🔐 OIDC publish with provenance for ${pkgName}`);
    // Do not pass NODE_AUTH_TOKEN for provenance
    run(`pnpm publish ${folder} --tag ${DIST_TAG} --access public --provenance --no-git-checks`);
  }
}

function dryRun() {
  console.log('=== Pre-flight dry-run check ===');
  for (const folder of nodePackageFolders) {
    const pkgJson = JSON.parse(fs.readFileSync(path.join(folder, 'package.json'), 'utf-8'));
    const firstPublish = !pnpmInfoExists(pkgJson.name);

    if (firstPublish) {
      console.log(`Dry-run for first-time publish: ${pkgJson.name}`);
      // Use NODE_AUTH_TOKEN only for first-time publish
      run(`pnpm publish ${folder} --dry-run --tag ${DIST_TAG} --access public --no-git-checks`, { NODE_AUTH_TOKEN });
    } else {
      console.log(`Dry-run with OIDC/provenance: ${pkgJson.name}`);
      // Unset NODE_AUTH_TOKEN for provenance
      run(`pnpm publish ${folder} --dry-run --tag ${DIST_TAG} --access public --provenance --no-git-checks`);
    }
  }

  console.log('Dry-run check complete → packages ready for publishing');
}

function publish() {
  console.log('=== Publishing Node packages ===');
  for (const folder of nodePackageFolders) {
    const pkgJson = JSON.parse(fs.readFileSync(path.join(folder, 'package.json'), 'utf-8'));
    publishFolder(folder, pkgJson.name);
  }
  console.log('=== All packages published successfully! ===');
}

// ---------------- Patching Angular package.json ----------------
patchAngularPackage();
// ---------------- DRY-RUN PRE-CHECK ----------------
dryRun();
// ---------------- REAL PUBLISH ----------------
publish();
