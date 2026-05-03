import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

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
        path.join(fixtureRoot, 'package.json'),
        JSON.stringify(
          {
            type: 'module',
          },
          null,
          2,
        ),
      );

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
              debugChangeHooks: {
                discountAmount: {
                  group: {
                    moduleSpecifier: './src/rsx-debug-change-hook',
                    exportName: 'rsxDebugChangeHook',
                  },
                },
              },
              preparseFile: 'dist/rsx-generated/rsx-aot-preparsed.generated.js',
              compiledFile: 'dist/rsx-generated/rsx-aot-compiled.generated.js',
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
        [
          "import { discountAmount } from './lazy-discount';",
          '',
          'export const packageMarker = true;',
          'export const discountFactory = discountAmount;',
          '',
        ].join('\n'),
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
          '  return: number',
          '  discount',
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
        registrationModule,
        indexModule,
      ] = await Promise.all([
        fs.readFile(path.join(fixtureRoot, 'dist', 'quote-total.js'), 'utf8'),
        fs.readFile(path.join(fixtureRoot, 'dist', 'quote-total.d.ts'), 'utf8'),
        fs.readFile(path.join(fixtureRoot, 'dist', 'lazy-discount.js'), 'utf8'),
        fs.readFile(
          path.join(fixtureRoot, 'dist', 'lazy-discount.d.ts'),
          'utf8',
        ),
        fs.readFile(
          path.join(
            fixtureRoot,
            'dist',
            'rsx-generated',
            'rsx-aot-preparsed.generated.js',
          ),
          'utf8',
        ),
        fs.readFile(
          path.join(
            fixtureRoot,
            'dist',
            'rsx-generated',
            'rsx-aot-compiled.generated.js',
          ),
          'utf8',
        ),
        fs.readFile(
          path.join(
            fixtureRoot,
            'dist',
            'rsx-generated',
            'rsx-aot-registration.generated.js',
          ),
          'utf8',
        ),
        fs.readFile(path.join(fixtureRoot, 'dist', 'index.js'), 'utf8'),
      ]);

      expect(totalModule).toContain('subtotal');
      expect(totalModule).toContain('"compiled": true');
      expect(totalModule).not.toContain('applyRsxDebugChangeHook');
      expect(totalDeclaration).toContain('QuoteModel');
      expect(totalDeclaration).toContain('IExpression<number>');

      expect(lazyModule).toContain('discount');
      expect(lazyModule).toContain('"lazyGroup": "package"');
      expect(lazyModule).not.toContain('applyRsxDebugChangeHook');
      expect(lazyModule).toContain(
        "import './rsx-generated/rsx-aot-registration.generated.js';",
      );
      expect(lazyDeclaration).toContain('discountAmount');

      expect(preparsedModule).toContain('subtotal');
      expect(compiledModule).toContain('subtotal');
      expect(registrationModule).toContain(
        "from './rsx-aot-preparsed.generated.js'",
      );
      expect(registrationModule).toContain(
        "from './rsx-aot-compiled.generated.js'",
      );
      expect(indexModule).toContain("from './lazy-discount.js'");

      await expect(
        fs.access(path.join(fixtureRoot, 'src', 'quote-total.ts')),
      ).rejects.toThrow();
      await expect(
        fs.access(path.join(fixtureRoot, 'src', 'lazy-discount.ts')),
      ).rejects.toThrow();
      await expect(
        fs.access(path.join(fixtureRoot, 'src', 'rsx-generated')),
      ).rejects.toThrow();
    } finally {
      await fs.rm(fixtureRoot, { recursive: true, force: true });
    }
  }, 20000);

  it('uses the nearest rsx config debug hook override for each .rsx file', async () => {
    await fs.mkdir(tempRoot, { recursive: true });
    const fixtureRoot = await fs.mkdtemp(path.join(tempRoot, 'rsx-config-'));

    try {
      await fs.mkdir(path.join(fixtureRoot, 'src', 'area'), {
        recursive: true,
      });

      await fs.writeFile(
        path.join(fixtureRoot, 'package.json'),
        JSON.stringify({ type: 'module' }, null, 2),
      );
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
              debugChangeHooks: {
                feeRsx: {
                  group: {
                    moduleSpecifier: './root-hook',
                    exportName: 'rootHook',
                  },
                },
              },
            },
          },
          null,
          2,
        ),
      );
      await fs.writeFile(
        path.join(fixtureRoot, 'src', 'area', 'rsx.config.json'),
        JSON.stringify(
          {
            build: {
              debugChangeHooks: {
                feeRsx: {
                  group: {
                    moduleSpecifier: './nested-hook',
                    exportName: 'nestedHook',
                  },
                },
              },
            },
          },
          null,
          2,
        ),
      );

      await fs.writeFile(
        path.join(fixtureRoot, 'src', 'index.ts'),
        'export const packageMarker = true;\n',
      );
      await fs.writeFile(
        path.join(fixtureRoot, 'src', 'root-hook.ts'),
        'export const rootHook = () => undefined;\n',
      );
      await fs.writeFile(
        path.join(fixtureRoot, 'src', 'area', 'nested-hook.ts'),
        'export const nestedHook = () => undefined;\n',
      );
      await fs.writeFile(
        path.join(fixtureRoot, 'src', 'root.rsx'),
        [
          'defaults:',
          '  model: {}',
          '',
          'expression: feeRsx',
          '  return: number',
          '  1',
          '',
        ].join('\n'),
      );
      await fs.writeFile(
        path.join(fixtureRoot, 'src', 'area', 'nested.rsx'),
        [
          'defaults:',
          '  model: {}',
          '',
          'expression: feeRsx',
          '  return: number',
          '  2',
          '',
        ].join('\n'),
      );

      execFileSync(
        process.execPath,
        [cliPath, 'build', '--project', 'tsconfig.json'],
        {
          cwd: fixtureRoot,
          stdio: 'pipe',
          env: {
            ...process.env,
            FORCE_COLOR: '0',
          },
        },
      );

      const rootModule = await fs.readFile(
        path.join(fixtureRoot, 'dist', 'root.js'),
        'utf8',
      );
      const nestedModule = await fs.readFile(
        path.join(fixtureRoot, 'dist', 'area', 'nested.js'),
        'utf8',
      );

      expect(rootModule).toContain(
        'import { rootHook as __rsxDebugChangeHook_feeRsx } from "./root-hook.js";',
      );
      expect(rootModule).toContain(
        'expression.changeHook = (changedExpression, oldValue) => {',
      );
      expect(rootModule).not.toContain('nestedHook');
      expect(nestedModule).toContain(
        'import { nestedHook as __rsxDebugChangeHook_feeRsx } from "./nested-hook.js";',
      );
      expect(nestedModule).toContain(
        'expression.changeHook = (changedExpression, oldValue) => {',
      );
      expect(nestedModule).not.toContain('rootHook');
    } finally {
      await fs.rm(fixtureRoot, { recursive: true, force: true });
    }
  }, 20000);

  it('injects debug hook instance ids at TypeScript call sites and runs the instance hook', async () => {
    await fs.mkdir(tempRoot, { recursive: true });
    const fixtureRoot = await fs.mkdtemp(
      path.join(tempRoot, 'rsx-hook-callsite-'),
    );

    try {
      await fs.mkdir(path.join(fixtureRoot, 'src'), { recursive: true });

      await fs.writeFile(
        path.join(fixtureRoot, 'package.json'),
        JSON.stringify({ type: 'module' }, null, 2),
      );
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

      const indexSource = [
        "import { feeRsx } from './fee';",
        '',
        'export const expression = feeRsx({ value: 3 });',
        '',
      ].join('\n');
      const instanceId = `src/index.ts:${indexSource.indexOf('feeRsx({')}:feeRsx`;
      await fs.writeFile(
        path.join(fixtureRoot, 'rsx.config.json'),
        JSON.stringify(
          {
            build: {
              debugChangeHooks: {
                feeRsx: {
                  group: {
                    moduleSpecifier: './group-hook',
                    exportName: 'groupHook',
                  },
                  instances: {
                    [instanceId]: {
                      moduleSpecifier: './instance-hook',
                      exportName: 'instanceHook',
                    },
                  },
                },
              },
            },
          },
          null,
          2,
        ),
      );

      await fs.writeFile(
        path.join(fixtureRoot, 'src', 'index.ts'),
        indexSource,
      );
      await fs.writeFile(
        path.join(fixtureRoot, 'src', 'group-hook.ts'),
        [
          'export const groupHook = (metadata: unknown, changedExpression: unknown, oldValue: unknown) => {',
          "  ((globalThis as any).__rsxHookCalls ??= []).push({ hook: 'group', metadata, changedExpression: Boolean(changedExpression), oldValue });",
          '};',
          '',
        ].join('\n'),
      );
      await fs.writeFile(
        path.join(fixtureRoot, 'src', 'instance-hook.ts'),
        [
          'export const instanceHook = (metadata: unknown, changedExpression: unknown, oldValue: unknown) => {',
          "  ((globalThis as any).__rsxHookCalls ??= []).push({ hook: 'instance', metadata, changedExpression: Boolean(changedExpression), oldValue });",
          '};',
          '',
        ].join('\n'),
      );
      await fs.writeFile(
        path.join(fixtureRoot, 'src', 'fee.rsx'),
        [
          'defaults:',
          '  model: { value: number }',
          '',
          'expression: feeRsx',
          '  return: number',
          '  value * 2',
          '',
        ].join('\n'),
      );

      execFileSync(
        process.execPath,
        [cliPath, 'build', '--project', 'tsconfig.json'],
        {
          cwd: fixtureRoot,
          stdio: 'pipe',
          env: {
            ...process.env,
            FORCE_COLOR: '0',
          },
        },
      );

      const indexModule = await fs.readFile(
        path.join(fixtureRoot, 'dist', 'index.js'),
        'utf8',
      );
      const feeModule = await fs.readFile(
        path.join(fixtureRoot, 'dist', 'fee.js'),
        'utf8',
      );

      expect(indexModule).toContain(
        `feeRsx({ value: 3 }, undefined, ${JSON.stringify(instanceId)})`,
      );
      expect(feeModule).toContain(
        'import { groupHook as __rsxDebugChangeHook_feeRsx } from "./group-hook.js";',
      );
      expect(feeModule).toContain(
        'import { instanceHook as __rsxDebugChangeHook_feeRsx_0 } from "./instance-hook.js";',
      );
      expect(feeModule).toContain(
        `${JSON.stringify(instanceId)}: __rsxDebugChangeHook_feeRsx_0`,
      );
      expect(feeModule).toContain(
        'expression.changeHook = (changedExpression, oldValue) => {',
      );

      (
        globalThis as typeof globalThis & { __rsxHookCalls?: unknown[] }
      ).__rsxHookCalls = [];
      const builtModule = await import(
        `${pathToFileURL(path.join(fixtureRoot, 'dist', 'index.js')).href}?hook-test=${Date.now()}`
      );
      builtModule.expression.changeHook?.(builtModule.expression, undefined);
      expect(
        (globalThis as typeof globalThis & { __rsxHookCalls?: unknown[] })
          .__rsxHookCalls,
      ).toEqual([
        expect.objectContaining({
          hook: 'instance',
          changedExpression: true,
          metadata: expect.objectContaining({
            expressionName: 'feeRsx',
            instanceId,
          }),
        }),
      ]);
    } finally {
      delete (globalThis as typeof globalThis & { __rsxHookCalls?: unknown[] })
        .__rsxHookCalls;
      await fs.rm(fixtureRoot, { recursive: true, force: true });
    }
  }, 20000);

  it('fails build when module-style .rsx headers are not indented', async () => {
    await fs.mkdir(tempRoot, { recursive: true });
    const fixtureRoot = await fs.mkdtemp(path.join(tempRoot, 'invalid-rsx-'));

    try {
      await fs.mkdir(path.join(fixtureRoot, 'src'), { recursive: true });
      await fs.writeFile(
        path.join(fixtureRoot, 'package.json'),
        JSON.stringify({ type: 'module' }, null, 2),
      );
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
        path.join(fixtureRoot, 'src', 'index.ts'),
        'export const packageMarker = true;\n',
      );
      await fs.writeFile(
        path.join(fixtureRoot, 'src', 'broken.rsx'),
        [
          'defaults:',
          '  model: { value: number }',
          '',
          'expression: brokenRsx',
          'return: number',
          'value * 2',
          '',
        ].join('\n'),
      );

      let buildError: unknown;
      try {
        execFileSync(
          process.execPath,
          [cliPath, 'build', '--project', 'tsconfig.json'],
          {
            cwd: fixtureRoot,
            stdio: 'pipe',
            env: {
              ...process.env,
              FORCE_COLOR: '0',
            },
          },
        );
      } catch (error) {
        buildError = error;
      }
      expect(buildError).toBeDefined();
      const output = String(
        (buildError as { stderr?: Buffer; stdout?: Buffer } | undefined)
          ?.stderr ?? '',
      );
      expect(output).toContain('RS-X module structure validation failed');
      expect(output).toContain(
        'Header "return" must be indented under defaults: or an expression block in module-style .rsx files.',
      );
    } finally {
      await fs.rm(fixtureRoot, { recursive: true, force: true });
    }
  }, 20000);
});
