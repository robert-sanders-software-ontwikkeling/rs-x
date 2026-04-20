import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const packageRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(packageRoot, '..');

describe('AOT runtime bundle', () => {
  it('keeps parser-only code out of the eager bundle for an AOT-style consumer', async () => {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), 'rsx-aot-runtime-bundle-'),
    );

    try {
      const entryPath = path.join(tempRoot, 'entry.ts');
      const outdir = path.join(tempRoot, 'dist');

      await fs.writeFile(
        entryPath,
        `
import { rsx } from ${JSON.stringify(
          path.join(packageRoot, 'lib', 'index.ts'),
        )};
import { registerPreparsedExpressionAst } from ${JSON.stringify(
          path.join(packageRoot, 'lib', 'aot-runtime', 'index.ts'),
        )};

registerPreparsedExpressionAst('x + y', {
  type: 'BinaryExpression',
  left: { type: 'Identifier', name: 'x', start: 0, end: 1, range: [0, 1] },
  right: { type: 'Identifier', name: 'y', start: 4, end: 5, range: [4, 5] },
  operator: '+',
  start: 0,
  end: 5,
  range: [0, 5],
});

const expression = rsx('x + y')({ x: 2, y: 3 });
console.log(expression.value);
`,
      );

      const buildScript = `
const { build } = require('esbuild');

build({
  entryPoints: [${JSON.stringify(entryPath)}],
  outdir: ${JSON.stringify(outdir)},
  bundle: true,
  format: 'esm',
  splitting: true,
  platform: 'browser',
  target: 'es2022',
  write: true,
  treeShaking: true,
  alias: {
    '@rs-x/core': ${JSON.stringify(
      path.join(workspaceRoot, 'rs-x-core', 'lib', 'index.ts'),
    )},
    '@rs-x/state-manager': ${JSON.stringify(
      path.join(workspaceRoot, 'rs-x-state-manager', 'lib', 'index.ts'),
    )},
  },
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
`;

      execFileSync(process.execPath, ['-e', buildScript], {
        cwd: workspaceRoot,
        stdio: 'pipe',
      });

      const outputFiles = await fs.readdir(outdir);
      const jsFiles = outputFiles.filter((file) => file.endsWith('.js'));
      const eagerBundleName = jsFiles.find((file) => file.startsWith('entry'));

      expect(eagerBundleName).toBeDefined();

      const eagerBundle = await fs.readFile(
        path.join(outdir, eagerBundleName!),
        'utf8',
      );

      expect(eagerBundle).not.toContain('parseScript(');
      expect(eagerBundle).not.toContain(
        'Multiple expression are not supported',
      );
      expect(eagerBundle).not.toContain('Unsupported expression type');
      expect(eagerBundle).toContain('runtime-expression-tools');

      const lazyRuntimeChunk = jsFiles.find((file) =>
        file.includes('runtime-expression-tools'),
      );
      expect(lazyRuntimeChunk).toBeDefined();

      const lazyRuntimeBundle = await fs.readFile(
        path.join(outdir, lazyRuntimeChunk!),
        'utf8',
      );

      expect(lazyRuntimeBundle).toContain('JsExpressionAstParser');

      const lazyBundleContents = await Promise.all(
        jsFiles
          .filter((file) => file !== eagerBundleName)
          .map((file) => fs.readFile(path.join(outdir, file), 'utf8')),
      );

      expect(
        lazyBundleContents.some((content) => content.includes('parseScript(')),
      ).toBe(true);
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });
});
