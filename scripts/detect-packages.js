import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

/**
 * Read pnpm-workspace.yaml to find workspace package globs
 * Fallback to scanning root directories if needed
 */
function getWorkspaceDirs() {
  const workspaceFile = path.join(root, 'pnpm-workspace.yaml');

  if (!fs.existsSync(workspaceFile)) {
    // Fallback: scan root dirs
    return fs
      .readdirSync(root, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .filter(name => !name.startsWith('.') && name !== 'node_modules' && name !== 'scripts');
  }

  const yaml = fs.readFileSync(workspaceFile, 'utf8');
  const matches = [...yaml.matchAll(/- (.+)/g)].map(m => m[1]);

  return matches
    .map(p => p.replace('/*', ''))
    .filter(Boolean);
}

const nodeLibs = [];
const angularLibs = [];

for (const dir of getWorkspaceDirs()) {
  const absDir = path.join(root, dir);
  const pkgJson = path.join(absDir, 'package.json');

  if (!fs.existsSync(pkgJson)) continue;

  const pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
  const name = pkg.name;
  if (!name) continue;

  const isAngular =
    pkg.dependencies?.['@angular/core'] ||
    pkg.peerDependencies?.['@angular/core'];

  if (isAngular) {
    angularLibs.push(name);
  } else {
    nodeLibs.push(name);
  }
}

// 🔑 Export to GitHub Actions
fs.appendFileSync(process.env.GITHUB_ENV, `node_libs=${nodeLibs.join(' ')}\n`);
fs.appendFileSync(process.env.GITHUB_ENV, `angular_libs=${angularLibs.join(' ')}\n`);

console.log('Detected Node libs:', nodeLibs);
console.log('Detected Angular libs:', angularLibs);