import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const workspaceRoot = path.resolve(__dirname, '../..');
const cliPath = path.join(workspaceRoot, 'rs-x-cli', 'bin', 'rsx.cjs');
const tempRoot = path.join(workspaceRoot, 'dist', 'jest', 'rs-x-cli');

describe('rsx cli angular init commonjs warnings', () => {
  it('patches angular.json with allowedCommonJsDependencies', async () => {
    await fs.mkdir(tempRoot, { recursive: true });
    const fixtureRoot = await fs.mkdtemp(path.join(tempRoot, 'angular-init-'));

    try {
      await fs.mkdir(path.join(fixtureRoot, 'src'), { recursive: true });

      await fs.writeFile(
        path.join(fixtureRoot, 'package.json'),
        JSON.stringify(
          {
            name: 'rsx-angular-init-commonjs',
            private: true,
            dependencies: {
              '@angular/core': '^21.2.0',
            },
            devDependencies: {
              typescript: '^6.0.2',
            },
          },
          null,
          2,
        ) + '\n',
      );

      await fs.writeFile(
        path.join(fixtureRoot, 'tsconfig.app.json'),
        JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2022',
              module: 'ES2022',
              moduleResolution: 'Bundler',
              experimentalDecorators: true,
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
                    configurations: {
                      production: {
                        budgets: [{ type: 'initial', maximumWarning: '500kb' }],
                      },
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
        `
import { bootstrapApplication } from '@angular/platform-browser';

bootstrapApplication(class AppComponent {}).catch(console.error);
`,
      );

      execFileSync(
        process.execPath,
        [
          cliPath,
          'init',
          '--skip-install',
          '--skip-vscode',
          '--entry',
          'src/main.ts',
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

      const angularJson = JSON.parse(
        await fs.readFile(path.join(fixtureRoot, 'angular.json'), 'utf8'),
      );

      const buildOptions = angularJson.projects.app.architect.build.options;

      expect(buildOptions.preserveSymlinks).toBe(true);
      expect(buildOptions.allowedCommonJsDependencies).toEqual(
        expect.arrayContaining([
          'reflect-metadata',
          'reflect-metadata/lite',
          'lodash.clonedeepwith',
        ]),
      );
      expect(
        angularJson.projects.app.architect.build.configurations.production
          .budgets,
      ).toBeUndefined();
    } finally {
      await fs.rm(fixtureRoot, { recursive: true, force: true });
    }
  }, 20000);
});
