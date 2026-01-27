import { execSync } from 'node:child_process';

const packages = [
  '@rs-x/core',
  '@rs-x/state-manager',
  '@rs-x/expression-parser',
  '@rs-x/angular',
];

for (const pkg of packages) {
  const version = execSync(
    `node -e "console.log(require('${pkg}/package.json').version)"`,
    { stdio: 'pipe' }
  ).toString().trim();

  try {
    execSync(`npm view ${pkg}@${version}`, { stdio: 'ignore' });
    throw new Error(`Version already published: ${pkg}@${version}`);
  } catch {
    console.log(`OK: ${pkg}@${version}`);
  }
}