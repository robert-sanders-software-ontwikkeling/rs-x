import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const workspaceRoot = path.resolve(__dirname, '../..');
const cliPath = path.join(workspaceRoot, 'rs-x-cli', 'bin', 'rsx.cjs');
const tempRoot = path.join(workspaceRoot, 'dist', 'jest', 'rs-x-cli');

describe('rsx cli angular build registration wiring', () => {
  it('wires generated Angular registration through an Angular browser wrapper without rewriting main.ts', async () => {
    await fs.mkdir(tempRoot, { recursive: true });
    const fixtureRoot = await fs.mkdtemp(
      path.join(tempRoot, 'angular-build-polyfills-'),
    );

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

      const originalMain = `export function main(): void {\n  console.log('hello');\n}\n\nmain();\n`;
      await fs.writeFile(
        path.join(fixtureRoot, 'src', 'main.ts'),
        originalMain,
      );
      await fs.writeFile(
        path.join(fixtureRoot, 'src', 'rsx-aot-registration.generated.ts'),
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

      const [mainContents, angularJsonContents] = await Promise.all([
        fs.readFile(path.join(fixtureRoot, 'src', 'main.ts'), 'utf8'),
        fs.readFile(path.join(fixtureRoot, 'angular.json'), 'utf8'),
      ]);
      const angularJson = JSON.parse(angularJsonContents);
      const buildOptions = angularJson.projects.app.architect.build.options;
      const wrapperPath = buildOptions.browser as string;
      const wrapperContents = await fs.readFile(
        path.join(fixtureRoot, wrapperPath),
        'utf8',
      );

      expect(mainContents).toBe(originalMain);
      expect(mainContents).not.toContain('rsx-aot-registration.generated');
      expect(wrapperPath).toBe(
        '.rsx-generated/rsx-angular-browser-entry.generated.ts',
      );
      expect(buildOptions.polyfills ?? []).not.toContain(
        '.rsx-generated/rsx-aot-registration.generated.ts',
      );
      expect(wrapperContents).toContain(
        "import './rsx-aot-registration.generated';",
      );
      expect(wrapperContents).toContain("import '../src/main';");
    } finally {
      await fs.rm(fixtureRoot, { recursive: true, force: true });
    }
  }, 20000);

  it('refreshes an existing Angular browser wrapper on repeat builds', async () => {
    await fs.mkdir(tempRoot, { recursive: true });
    const fixtureRoot = await fs.mkdtemp(
      path.join(tempRoot, 'angular-build-wrapper-refresh-'),
    );

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
                      browser: 'src/rsx-angular-browser-entry.generated.ts',
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
        path.join(fixtureRoot, 'src', 'rsx-aot-registration.generated.ts'),
        'export {};\n',
      );
      await fs.writeFile(
        path.join(fixtureRoot, 'src', 'rsx-angular-browser-entry.generated.ts'),
        [
          '// @ts-nocheck',
          '/* eslint-disable */',
          '/* This file is auto-generated by rsx build. Do not edit manually. */',
          '/* RS-X original browser entry: src/main.ts */',
          "import './main';",
          '',
        ].join('\n'),
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

      const wrapperContents = await fs.readFile(
        path.join(
          fixtureRoot,
          '.rsx-generated',
          'rsx-angular-browser-entry.generated.ts',
        ),
        'utf8',
      );

      expect(wrapperContents).toContain(
        "import './rsx-aot-registration.generated';",
      );
      expect(wrapperContents).toContain("import '../src/main';");
    } finally {
      await fs.rm(fixtureRoot, { recursive: true, force: true });
    }
  }, 20000);

  it('recreates the Angular browser wrapper when angular.json points to it but the file is missing', async () => {
    await fs.mkdir(tempRoot, { recursive: true });
    const fixtureRoot = await fs.mkdtemp(
      path.join(tempRoot, 'angular-build-wrapper-missing-'),
    );

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
                      browser: 'src/rsx-angular-browser-entry.generated.ts',
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
        path.join(fixtureRoot, 'src', 'rsx-aot-registration.generated.ts'),
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

      const wrapperContents = await fs.readFile(
        path.join(
          fixtureRoot,
          '.rsx-generated',
          'rsx-angular-browser-entry.generated.ts',
        ),
        'utf8',
      );

      expect(wrapperContents).toContain(
        "import './rsx-aot-registration.generated';",
      );
      expect(wrapperContents).toContain(
        "import '../src/rsx-angular-browser-entry.generated';",
      );
    } finally {
      await fs.rm(fixtureRoot, { recursive: true, force: true });
    }
  }, 20000);
});
