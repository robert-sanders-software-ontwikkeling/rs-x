import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const workspaceRoot = path.resolve(__dirname, '../..');
const cliPath = path.join(workspaceRoot, 'rs-x-cli', 'bin', 'rsx.cjs');
const tempRoot = path.join(workspaceRoot, 'dist', 'jest', 'rs-x-cli');

describe('rsx cli angular build --log', () => {
  it('enables runtime execution logging from the generated Angular registration file', async () => {
    await fs.mkdir(tempRoot, { recursive: true });
    const fixtureRoot = await fs.mkdtemp(path.join(tempRoot, 'angular-log-'));

    try {
      await fs.mkdir(path.join(fixtureRoot, 'src'), { recursive: true });

      await fs.writeFile(
        path.join(fixtureRoot, 'tsconfig.app.json'),
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
              ignoreDeprecations: '6.0',
              rootDir: '.',
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
        ) + '\n',
      );

      await fs.writeFile(
        path.join(fixtureRoot, 'angular.json'),
        JSON.stringify(
          {
            version: 1,
            projects: {
              app: {
                architect: {
                  build: {
                    options: {
                      tsConfig: 'tsconfig.app.json',
                      browser: 'src/main.ts',
                    },
                  },
                },
              },
            },
          },
          null,
          2,
        ) + '\n',
      );

      await fs.writeFile(
        path.join(fixtureRoot, 'src', 'main.ts'),
        'export {};\n',
      );
      await fs.writeFile(
        path.join(fixtureRoot, 'src', 'expr.ts'),
        `
import { rsx } from '@rs-x/expression-parser';

const model = { a: 1, b: 2 };
rsx<number>('a + b')(model);
`,
      );

      execFileSync(
        process.execPath,
        [
          cliPath,
          'build',
          '--project',
          'tsconfig.app.json',
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

      const registration = await fs.readFile(
        path.join(fixtureRoot, 'src', 'rsx-aot-registration.generated.ts'),
        'utf8',
      );

      expect(registration).toContain('function installRsxExecutionLogging()');
      expect(registration).toContain(
        "import { CompiledExpression, ExpressionCache, ExpressionEngineSelector } from '@rs-x/expression-parser';",
      );
      expect(registration).toContain('ExpressionCache?.prototype');
      expect(registration).toContain('ExpressionEngineSelector?.prototype');
      expect(registration).toContain('installRsxExecutionLogging();');
    } finally {
      await fs.rm(fixtureRoot, { recursive: true, force: true });
    }
  }, 20000);
});
