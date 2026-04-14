import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const workspaceRoot = path.resolve(__dirname, '../..');
const cliPath = path.join(workspaceRoot, 'rs-x-cli', 'bin', 'rsx.cjs');
const tempRoot = path.join(workspaceRoot, 'dist', 'jest', 'rs-x-cli');

describe('rsx cli build lazy groups --log', () => {
  it('injects lazy manifest import logging into the generated manifest', async () => {
    await fs.mkdir(tempRoot, { recursive: true });
    const fixtureRoot = await fs.mkdtemp(
      path.join(tempRoot, 'lazy-groups-log-'),
    );

    try {
      await fs.mkdir(path.join(fixtureRoot, 'src'), { recursive: true });
      await fs.mkdir(path.join(fixtureRoot, 'public'), { recursive: true });

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
                '@rs-x/expression-parser/aot-runtime': [
                  '../rs-x-expression-parser/lib/aot-runtime/index.ts',
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
        [
          cliPath,
          'build',
          '--project',
          'tsconfig.json',
          '--no-emit',
          '--prod',
          '--log',
        ],
        {
          cwd: fixtureRoot,
          stdio: 'pipe',
          env: {
            ...process.env,
            FORCE_COLOR: '0',
          },
        },
      );

      const manifest = await fs.readFile(
        path.join(
          fixtureRoot,
          'tmp',
          'generated',
          'rsx-aot-lazy-manifest.generated.ts',
        ),
        'utf8',
      );

      expect(manifest).toContain('const debugLazy = (message) => {');
      expect(manifest).toContain('lazy-manifest registered 3 expressions');
      expect(manifest).toContain(
        'lazy-manifest import-start __rsx_ungrouped__',
      );
      expect(manifest).toContain(
        'lazy-manifest import-resolved __rsx_ungrouped__',
      );
      expect(manifest).toContain('lazy-manifest import-start Page1');
      expect(manifest).toContain('lazy-manifest import-resolved Page1');
      expect(manifest).toContain('lazy-manifest import-start Page2');
      expect(manifest).toContain('lazy-manifest import-resolved Page2');
    } finally {
      await fs.rm(fixtureRoot, { recursive: true, force: true });
    }
  }, 20000);
});
