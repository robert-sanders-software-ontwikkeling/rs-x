#!/usr/bin/env node
import { execSync, spawnSync } from 'node:child_process';
import fs from 'fs';
import path from 'path';

const DIST_TAG = process.env.DIST_TAG || 'latest';
const NODE_AUTH_TOKEN = process.env.NODE_AUTH_TOKEN;

const angularDist = 'rs-x-angular/dist/rsx';

const nodeLibFolders = [
  'rs-x-core',
  'rs-x-state-manager',
  'rs-x-expression-parser',
  'rs-x-compiler',
  'rs-x-typescript-plugin',
  'rs-x-cli',
  'rs-x-react',
  'rs-x-vue',
  'rs-x-react-components',
];
const nodePackageFolders = [...nodeLibFolders, angularDist];
const changelogFolders = [...nodeLibFolders, 'rs-x-angular/projects/rsx'];

// ---------------- UTILITIES ----------------
function run(command, args, envOverrides = {}) {
  const printable = [command, ...args].join(' ');
  console.log(`> ${printable}`);
  const result = spawnSync(command, args, {
    stdio: 'pipe',
    env: { ...process.env, ...envOverrides },
  });
  if (result.stdout?.length) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr?.length) {
    process.stderr.write(result.stderr);
  }
  if (result.error) {
    throw result.error;
  }
  if (typeof result.status === 'number' && result.status !== 0) {
    const error = new Error(`Command failed: ${printable}`);
    error.status = result.status;
    throw error;
  }
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
  const result = spawnSync('pnpm', ['info', pkgName, 'version', '--json'], {
    stdio: 'pipe',
    env: process.env,
  });

  if (result.error) {
    console.warn(
      `[publish] Failed to check npm info for ${pkgName}: ${result.error.message}`,
    );
    return false;
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.toString().trim();
    if (stderr) {
      console.warn(`[publish] pnpm info ${pkgName} failed: ${stderr}`);
    }
    return false;
  }

  const stdout = result.stdout?.toString().trim();
  return Boolean(stdout && stdout !== 'null');
}

// ---------------- PATCH ANGULAR ----------------
function toMajorRange(version) {
  const [major, minor] = version.split('.').map(Number);
  const hasPrerelease = version.includes('-');

  if (major === 0) {
    // pre-1.0: minor is the breaking boundary
    return hasPrerelease ? `>=0.${minor}.0-0` : `^0.${minor}.0`;
  }

  return hasPrerelease ? `>=${major}.0.0-0` : `^${major}.0.0`;
}

function patchAngularPackage() {
  console.log('=== Patching Angular package.json ===');

  const pkgJsonPath = path.join(angularDist, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    console.error('Angular dist folder not found:', angularDist);
    process.exit(1);
  }

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));

  const coreVersion = getLocalPackageVersion('rs-x-core');
  const parserVersion = getLocalPackageVersion('rs-x-expression-parser');

  pkgJson.peerDependencies ??= {};
  pkgJson.peerDependencies['@rs-x/core'] = toMajorRange(coreVersion);
  pkgJson.peerDependencies['@rs-x/expression-parser'] =
    toMajorRange(parserVersion);

  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
  console.log(
    '✅ Patched Angular peerDependencies using MAJOR ranges (prerelease-aware)',
  );
}

// ---------------- PUBLISH LOGIC ----------------
function publishFolder(folder, pkgName) {
  const firstPublish = !pnpmInfoExists(pkgName);
  const version = getLocalPackageVersion(folder);
  console.log(
    `Publishing ${pkgName}@${version} (${firstPublish ? 'first' : 'existing'})`,
  );

  if (firstPublish && !NODE_AUTH_TOKEN) {
    console.error(
      `Error: NODE_AUTH_TOKEN missing for first-time publish of ${pkgName}`,
    );
    process.exit(1);
  }

  if (firstPublish) {
    console.log(`🚀 First-time publish of ${pkgName}`);
    // Pass NODE_AUTH_TOKEN for first-time publish
    run(
      'pnpm',
      [
        'publish',
        folder,
        '--tag',
        DIST_TAG,
        '--access',
        'public',
        '--no-git-checks',
      ],
      {
        NODE_AUTH_TOKEN,
      },
    );
  } else {
    console.log(`🔐 OIDC publish with provenance for ${pkgName}`);
    // Do not pass NODE_AUTH_TOKEN for provenance
    try {
      run('pnpm', [
        'publish',
        folder,
        '--tag',
        DIST_TAG,
        '--access',
        'public',
        '--provenance',
        '--no-git-checks',
      ]);
    } catch (error) {
      console.error(`⚠️  Provenance publish failed for ${pkgName}.`);
      if (!NODE_AUTH_TOKEN) {
        throw error;
      }
      console.log(
        `🔁 Retrying ${pkgName} publish with NODE_AUTH_TOKEN (no provenance).`,
      );
      run(
        'pnpm',
        [
          'publish',
          folder,
          '--tag',
          DIST_TAG,
          '--access',
          'public',
          '--no-git-checks',
        ],
        {
          NODE_AUTH_TOKEN,
        },
      );
    }
  }
}

function dryRun() {
  console.log('=== Pre-flight dry-run check ===');
  for (const folder of nodePackageFolders) {
    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(folder, 'package.json'), 'utf-8'),
    );
    const firstPublish = !pnpmInfoExists(pkgJson.name);

    if (firstPublish) {
      console.log(`Dry-run for first-time publish: ${pkgJson.name}`);
      // Use NODE_AUTH_TOKEN only for first-time publish
      run(
        'pnpm',
        [
          'publish',
          folder,
          '--dry-run',
          '--tag',
          DIST_TAG,
          '--access',
          'public',
          '--no-git-checks',
        ],
        { NODE_AUTH_TOKEN },
      );
    } else {
      console.log(`Dry-run with OIDC/provenance: ${pkgJson.name}`);
      // Unset NODE_AUTH_TOKEN for provenance
      run('pnpm', [
        'publish',
        folder,
        '--dry-run',
        '--tag',
        DIST_TAG,
        '--access',
        'public',
        '--provenance',
        '--no-git-checks',
      ]);
    }
  }

  console.log('Dry-run check complete → packages ready for publishing');
}

function publish() {
  console.log('=== Publishing Node packages ===');
  for (const folder of nodePackageFolders) {
    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(folder, 'package.json'), 'utf-8'),
    );
    publishFolder(folder, pkgJson.name);
  }
  console.log('=== All packages published successfully! ===');
}

function generateRootChangelog() {
  console.log('=== Generating root-level CHANGELOG.md ===');

  // Node + Angular packages
  const changelogFiles = changelogFolders.map((f) =>
    path.join(f, 'CHANGELOG.md'),
  );

  let combined = '';
  for (const file of changelogFiles) {
    if (fs.existsSync(file)) {
      combined += fs.readFileSync(file, 'utf-8') + '\n\n';
    } else {
      console.log(`⚠️  Skipping missing changelog: ${file}`);
    }
  }

  if (!combined) {
    combined = 'No changes recorded in changelogs yet.';
  }

  fs.writeFileSync('CHANGELOG.md', combined);
  console.log('✅ Root CHANGELOG.md created or updated');
}

patchAngularPackage();
dryRun();
publish();
generateRootChangelog();
