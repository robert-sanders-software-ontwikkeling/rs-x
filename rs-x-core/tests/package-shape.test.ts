import fs from 'node:fs';
import path from 'node:path';

describe('@rs-x/core package shape', () => {
  const packageRoot = path.resolve(__dirname, '..');
  const packageJsonPath = path.join(packageRoot, 'package.json');
  const sourceDependencyInjectionPath = path.join(
    packageRoot,
    'lib',
    'dependency-injection.ts',
  );

  it('does not depend on lodash.clonedeepwith anymore', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    expect(packageJson.dependencies?.['lodash.clonedeepwith']).toBeUndefined();
  });

  it('does not import reflect-metadata directly from the core runtime', () => {
    const source = fs.readFileSync(sourceDependencyInjectionPath, 'utf8');

    expect(source).not.toContain(`import 'reflect-metadata';`);
  });
});
