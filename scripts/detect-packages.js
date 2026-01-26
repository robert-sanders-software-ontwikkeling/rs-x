import fs from 'fs';
import path from 'path';

const root = process.cwd();
const packagesDir = path.join(root, 'packages');

const nodeLibs = [];
const angularLibs = [];

for (const dir of fs.readdirSync(packagesDir)) {
  const pkgPath = path.join(packagesDir, dir, 'package.json');
  if (!fs.existsSync(pkgPath)) continue;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const name = pkg.name;

  if (!name) continue;

  if (pkg.dependencies?.['@angular/core'] || pkg.peerDependencies?.['@angular/core']) {
    angularLibs.push(name);
  } else {
    nodeLibs.push(name);
  }
}

// 🔑 EXPORT TO GITHUB ACTIONS
const envFile = process.env.GITHUB_ENV;

fs.appendFileSync(envFile, `node_libs=${nodeLibs.join(' ')}\n`);
fs.appendFileSync(envFile, `angular_libs=${angularLibs.join(' ')}\n`);

console.log('Node libs:', nodeLibs);
console.log('Angular libs:', angularLibs);