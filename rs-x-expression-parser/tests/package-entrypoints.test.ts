import fs from 'node:fs';
import path from 'node:path';

describe('@rs-x/expression-parser package entrypoints', () => {
  const packageRoot = path.resolve(__dirname, '..');
  const packageJsonPath = path.join(packageRoot, 'package.json');
  const sourceIndexPath = path.join(packageRoot, 'lib', 'index.ts');

  it('does not export benchmark data from the root entrypoint', () => {
    const sourceIndex = fs.readFileSync(sourceIndexPath, 'utf8');

    expect(sourceIndex).not.toContain(`export * from './benchmark';`);
  });

  it('does not export testing helpers from the root entrypoint', () => {
    const sourceIndex = fs.readFileSync(sourceIndexPath, 'utf8');

    expect(sourceIndex).not.toContain(`export * from './testing';`);
  });

  it('does not publish benchmark data as a package subpath export', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    expect(packageJson.exports['./benchmark']).toBeUndefined();
  });

  it('keeps AOT runtime helpers available via a dedicated subpath export', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    expect(packageJson.exports['./aot-runtime']).toEqual({
      types: './dist/aot-runtime/index.d.ts',
      import: './dist/aot-runtime/index.js',
      default: './dist/aot-runtime/index.js',
    });
  });

  it('keeps testing helpers available via a dedicated subpath export', () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    expect(packageJson.exports['./testing']).toEqual({
      types: './dist/testing/index.d.ts',
      import: './dist/testing/index.js',
      default: './dist/testing/index.js',
    });
  });
});
