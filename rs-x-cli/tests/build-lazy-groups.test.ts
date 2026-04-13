import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const workspaceRoot = path.resolve(__dirname, '../..');
const cliPath = path.join(workspaceRoot, 'rs-x-cli', 'bin', 'rsx.cjs');
const tempRoot = path.join(workspaceRoot, 'dist', 'jest', 'rs-x-cli');

describe('rsx cli build lazy groups', () => {
  it('emits one lazy payload file per lazyGroup', async () => {
    await fs.mkdir(tempRoot, { recursive: true });
    const fixtureRoot = await fs.mkdtemp(path.join(tempRoot, 'lazy-groups-'));

    try {
      await fs.mkdir(path.join(fixtureRoot, 'src'), { recursive: true });

      await fs.writeFile(
        path.join(fixtureRoot, 'tsconfig.json'),
        JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2022',
              module: 'ES2022',
              moduleResolution: 'Bundler',
              strict: false,
              noImplicitAny: false,
              skipLibCheck: true,
              esModuleInterop: true,
              allowSyntheticDefaultImports: true,
              experimentalDecorators: true,
              emitDecoratorMetadata: true,
              ignoreDeprecations: '6.0',
              rootDir: '..',
              types: ['node'],
              baseUrl: '.',
              paths: {
                '@rs-x/core': ['../rs-x-core/lib/index.ts'],
                '@rs-x/state-manager': ['../rs-x-state-manager/lib/index.ts'],
                '@rs-x/expression-parser': [
                  '../rs-x-expression-parser/lib/index.ts',
                ],
              },
            },
            include: ['src/**/*.ts'],
          },
          null,
          2,
        ),
      );

      await fs.writeFile(
        path.join(fixtureRoot, 'rsx.config.json'),
        JSON.stringify(
          {
            build: {
              preparse: true,
              compiled: true,
              preparseFile: 'tmp/generated/custom-preparse.ts',
              compiledFile: 'tmp/generated/custom-compiled.ts',
              registrationFile: 'tmp/generated/custom-registration.ts',
            },
          },
          null,
          2,
        ),
      );

      await fs.writeFile(
        path.join(fixtureRoot, 'src', 'page.ts'),
        `
import { rsx } from '@rs-x/expression-parser';

const page1Model = { a: 1, b: 2 };
const page2Model = { x: 3, y: 4 };
const ungroupedModel = { m: 10, n: 5 };

rsx<number>('a + b', { lazyGroup: 'Page1' })(page1Model);
rsx<number>('x * y', { lazyGroup: 'Page2' })(page2Model);
rsx<number>('m - n', { lazy: true })(ungroupedModel);
`,
      );

      execFileSync(
        process.execPath,
        [cliPath, 'build', '--project', 'tsconfig.json', '--no-emit', '--prod'],
        {
          cwd: fixtureRoot,
          stdio: 'pipe',
          env: {
            ...process.env,
            FORCE_COLOR: '0',
          },
        },
      );

      const generatedDir = path.join(fixtureRoot, 'tmp', 'generated');
      const manifestPath = path.join(
        generatedDir,
        'rsx-aot-lazy-manifest.generated.ts',
      );
      const ungroupedPath = path.join(
        generatedDir,
        'rsx-aot-lazy.generated.ts',
      );
      const page1Path = path.join(
        generatedDir,
        'rsx-aot-lazy-group-Page1.generated.ts',
      );
      const page2Path = path.join(
        generatedDir,
        'rsx-aot-lazy-group-Page2.generated.ts',
      );

      await expect(fs.stat(manifestPath)).resolves.toBeDefined();
      await expect(fs.stat(ungroupedPath)).resolves.toBeDefined();
      await expect(fs.stat(page1Path)).resolves.toBeDefined();
      await expect(fs.stat(page2Path)).resolves.toBeDefined();

      const [manifest, ungrouped, page1, page2] = await Promise.all([
        fs.readFile(manifestPath, 'utf8'),
        fs.readFile(ungroupedPath, 'utf8'),
        fs.readFile(page1Path, 'utf8'),
        fs.readFile(page2Path, 'utf8'),
      ]);

      expect(manifest).toContain('rsx-aot-lazy.generated');
      expect(manifest).toContain('rsx-aot-lazy-group-Page1.generated');
      expect(manifest).toContain('rsx-aot-lazy-group-Page2.generated');
      expect(manifest).toContain('"Page1"');
      expect(manifest).toContain('"Page2"');

      expect(ungrouped).toContain('m - n');
      expect(ungrouped).not.toContain('a + b');
      expect(ungrouped).not.toContain('x * y');

      expect(page1).toContain('a + b');
      expect(page1).not.toContain('x * y');
      expect(page1).not.toContain('m - n');

      expect(page2).toContain('x * y');
      expect(page2).not.toContain('a + b');
      expect(page2).not.toContain('m - n');
    } finally {
      await fs.rm(fixtureRoot, { recursive: true, force: true });
    }
  }, 20000);
});
