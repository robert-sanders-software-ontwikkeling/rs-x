import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const workspaceRoot = path.resolve(__dirname, '../..');
const cliPath = path.join(workspaceRoot, 'rs-x-cli', 'bin', 'rsx.cjs');
const tempRoot = path.join(workspaceRoot, 'dist', 'jest', 'rs-x-cli');

describe('rsx cli generic init TypeScript config', () => {
  it('creates buildable generic TypeScript and RS-X configs when none exist', async () => {
    await fs.mkdir(tempRoot, { recursive: true });
    const fixtureRoot = await fs.mkdtemp(path.join(tempRoot, 'init-generic-'));

    try {
      await fs.mkdir(path.join(fixtureRoot, 'src'), { recursive: true });
      await fs.writeFile(
        path.join(fixtureRoot, 'src', 'main.ts'),
        `function main(): void {
  console.log('hello');
}

main();
`,
      );

      execFileSync(
        process.execPath,
        [cliPath, 'init', '--skip-install', '--skip-vscode'],
        {
          cwd: fixtureRoot,
          stdio: 'pipe',
          env: {
            ...process.env,
            FORCE_COLOR: '0',
          },
        },
      );

      const tsConfig = JSON.parse(
        await fs.readFile(path.join(fixtureRoot, 'tsconfig.json'), 'utf8'),
      );
      expect(tsConfig.compilerOptions).toEqual(
        expect.objectContaining({
          module: 'Node16',
          moduleResolution: 'Node16',
          outDir: 'dist',
          rootDir: 'src',
          sourceMap: true,
        }),
      );
      expect(tsConfig.compilerOptions.plugins).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: '@rs-x/typescript-plugin' }),
        ]),
      );

      const rsxConfig = JSON.parse(
        await fs.readFile(path.join(fixtureRoot, 'rsx.config.json'), 'utf8'),
      );
      expect(rsxConfig.build).toEqual(
        expect.objectContaining({
          buildFolder: 'dist/.rsx-generated',
          preparseFile: 'rsx-aot-preparsed.generated.js',
          compiledFile: 'rsx-aot-compiled.generated.js',
          registrationFile: 'rsx-aot-registration.generated.js',
        }),
      );

      const main = await fs.readFile(
        path.join(fixtureRoot, 'src', 'main.ts'),
        'utf8',
      );
      expect(main).toBe(`function main(): void {
  console.log('hello');
}

main();
`);
      await expect(
        fs.stat(path.join(fixtureRoot, 'src', 'rsx-bootstrap.ts')),
      ).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await fs.rm(fixtureRoot, { recursive: true, force: true });
    }
  });

  it('patches an existing generic tsconfig without replacing user compiler options', async () => {
    await fs.mkdir(tempRoot, { recursive: true });
    const fixtureRoot = await fs.mkdtemp(
      path.join(tempRoot, 'init-existing-tsconfig-'),
    );

    try {
      await fs.writeFile(
        path.join(fixtureRoot, 'package.json'),
        JSON.stringify({ name: 'existing-rsx', private: true }, null, 2),
      );
      await fs.writeFile(
        path.join(fixtureRoot, 'tsconfig.json'),
        JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2021',
              module: 'CommonJS',
              moduleResolution: 'Node',
              strict: false,
              plugins: [{ name: 'existing-plugin' }],
            },
            include: ['custom/**/*.ts'],
          },
          null,
          2,
        ),
      );

      execFileSync(
        process.execPath,
        [cliPath, 'init', '--skip-install', '--skip-vscode'],
        {
          cwd: fixtureRoot,
          stdio: 'pipe',
          env: {
            ...process.env,
            FORCE_COLOR: '0',
          },
        },
      );

      const tsConfig = JSON.parse(
        await fs.readFile(path.join(fixtureRoot, 'tsconfig.json'), 'utf8'),
      );
      expect(tsConfig.compilerOptions).toEqual(
        expect.objectContaining({
          target: 'ES2021',
          module: 'Node16',
          moduleResolution: 'Node16',
          strict: false,
        }),
      );
      expect(tsConfig.include).toEqual(['custom/**/*.ts']);
      expect(tsConfig.compilerOptions.plugins).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'existing-plugin' }),
          expect.objectContaining({ name: '@rs-x/typescript-plugin' }),
        ]),
      );
    } finally {
      await fs.rm(fixtureRoot, { recursive: true, force: true });
    }
  });
});
