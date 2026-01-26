import { execSync } from 'node:child_process';
import fs from 'node:fs';

const output = execSync('pnpm m ls --json', { encoding: 'utf8' });
const packages = JSON.parse(output);

const nodeLibs = [];
const angularLibs = [];

for (const pkg of packages) {
  const name = pkg.name;
  const manifest = pkg.manifest;

  if (!name || !manifest) continue;

  const isAngular =
    manifest.dependencies?.['@angular/core'] ||
    manifest.peerDependencies?.['@angular/core'];

  if (isAngular) {
    angularLibs.push(name);
  } else {
    nodeLibs.push(name);
  }
}

fs.appendFileSync(process.env.GITHUB_ENV, `node_libs=${nodeLibs.join(' ')}\n`);
fs.appendFileSync(process.env.GITHUB_ENV, `angular_libs=${angularLibs.join(' ')}\n`);

console.log('Detected Node libs:', nodeLibs);
console.log('Detected Angular libs:', angularLibs);