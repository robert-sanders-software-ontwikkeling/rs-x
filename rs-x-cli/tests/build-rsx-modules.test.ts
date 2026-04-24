import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const workspaceRoot = path.resolve(__dirname, '../..');
const cliPath = path.join(workspaceRoot, 'rs-x-cli', 'bin', 'rsx.cjs');
const tempRoot = path.join(workspaceRoot, 'dist', 'jest', 'rs-x-cli');

describe('rsx cli .rsx module build output', () => {
  it('compiles .rsx files even when no TypeScript file imports them', async () => {
    await fs.mkdir(tempRoot, { recursive: true });
    const fixtureRoot = await fs.mkdtemp(path.join(tempRoot, 'rsx-modules-'));

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
              strict: true,
              skipLibCheck: true,
              esModuleInterop: true,
              ignoreDeprecations: '6.0',
              rootDir: 'src',
              outDir: 'dist',
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
              preparseFile: 'dist/rsx-aot-preparsed.generated.ts',
              compiledFile: 'dist/rsx-aot-compiled.generated.ts',
            },
          },
          null,
          2,
        ),
      );

      await fs.writeFile(
        path.join(fixtureRoot, 'src', 'model.ts'),
        [
          'export interface QuoteModel {',
          '  subtotal: number;',
          '  tax: number;',
          '  discount: number;',
          '}',
          '',
        ].join('\n'),
      );
      await fs.writeFile(
        path.join(fixtureRoot, 'src', 'index.ts'),
        'export const packageMarker = true;\n',
      );
      await fs.writeFile(
        path.join(fixtureRoot, 'src', 'quote-total.rsx'),
        [
          "model: import('./model').QuoteModel",
          'return: number',
          '',
          'subtotal',
          '',
        ].join('\n'),
      );
      await fs.writeFile(
        path.join(fixtureRoot, 'src', 'lazy-discount.rsx'),
        [
          'defaults:',
          "  model: import('./model').QuoteModel",
          '  lazyGroup: package',
          '',
          'expression: discountAmount',
          'return: number',
          'discount',
          '',
        ].join('\n'),
      );

      execFileSync(
        process.execPath,
        [cliPath, 'build', '--project', 'tsconfig.json', '--prod'],
        {
          cwd: fixtureRoot,
          stdio: 'pipe',
          env: {
            ...process.env,
            FORCE_COLOR: '0',
          },
        },
      );

      const [
        totalModule,
        totalDeclaration,
        lazyModule,
        lazyDeclaration,
        preparsedModule,
        compiledModule,
      ] = await Promise.all([
        fs.readFile(path.join(fixtureRoot, 'dist', 'quote-total.js'), 'utf8'),
        fs.readFile(path.join(fixtureRoot, 'dist', 'quote-total.d.ts'), 'utf8'),
        fs.readFile(path.join(fixtureRoot, 'dist', 'lazy-discount.js'), 'utf8'),
        fs.readFile(
          path.join(fixtureRoot, 'dist', 'lazy-discount.d.ts'),
          'utf8',
        ),
        fs.readFile(
          path.join(fixtureRoot, 'dist', 'rsx-aot-preparsed.generated.ts'),
          'utf8',
        ),
        fs.readFile(
          path.join(fixtureRoot, 'dist', 'rsx-aot-compiled.generated.ts'),
          'utf8',
        ),
      ]);

      expect(totalModule).toContain('subtotal');
      expect(totalModule).toContain('"compiled": true');
      expect(totalDeclaration).toContain('QuoteModel');
      expect(totalDeclaration).toContain('IExpression<number>');

      expect(lazyModule).toContain('discount');
      expect(lazyModule).toContain('"lazyGroup": "package"');
      expect(lazyDeclaration).toContain('discountAmount');

      expect(preparsedModule).toContain('subtotal');
      expect(compiledModule).toContain('subtotal');

      await expect(
        fs.access(path.join(fixtureRoot, 'src', 'quote-total.ts')),
      ).rejects.toThrow();
      await expect(
        fs.access(path.join(fixtureRoot, 'src', 'lazy-discount.ts')),
      ).rejects.toThrow();
    } finally {
      await fs.rm(fixtureRoot, { recursive: true, force: true });
    }
  }, 20000);
});
