import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const appNameFromArg = process.argv
  .slice(2)
  .find((arg) => !arg.startsWith('--'));
const appName = appNameFromArg || process.env.MONACO_DTS_APP || 'rs-x-expression-editor';
const appRoot = path.join(repoRoot, appName);

const outRoot = path.join(appRoot, 'public', 'monaco-dts');
const outNodeModules = path.join(outRoot, 'node_modules');
const outChunksDir = path.join(outRoot, 'chunks');

const CHUNK_COUNT = 24;

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function walkFiles(dir, filterFn, acc = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      walkFiles(p, filterFn, acc);
    } else if (e.isFile()) {
      if (filterFn(p)) {
        acc.push(p);
      }
    }
  }
  return acc;
}

function relToNodeModules(absPath) {
  const nm = `${path.sep}node_modules${path.sep}`;
  const idx = absPath.lastIndexOf(nm);
  if (idx === -1) {
    throw new Error(`Not inside node_modules: ${absPath}`);
  }
  return absPath.slice(idx + nm.length).replaceAll(path.sep, '/');
}

function resolvePackageDir(pkgName) {
  const pkgJsonPath = require.resolve(`${pkgName}/package.json`, {
    paths: [repoRoot],
  });
  return path.dirname(pkgJsonPath);
}

function chunkArray(items, chunkCount) {
  const chunks = Array.from({ length: chunkCount }, () => []);
  for (let i = 0; i < items.length; i++) {
    chunks[i % chunkCount].push(items[i]);
  }
  return chunks.filter((c) => c.length > 0);
}

function main() {
  if (!fs.existsSync(appRoot)) {
    throw new Error(
      `[monaco-dts] Target app folder does not exist: ${appRoot}\n` +
        `Pass app name as first arg, e.g.: node scripts/copy-monaco-dts.mjs rs-x-site`,
    );
  }

  console.log('[monaco-dts] Writing to:', outRoot);

  const rxjsDir = resolvePackageDir('rxjs');
  const tslibDir = resolvePackageDir('tslib');

  ensureDir(outNodeModules);
  ensureDir(outChunksDir);

  const rxjsDts = walkFiles(rxjsDir, (p) => p.endsWith('.d.ts'));
  const tslibDts = walkFiles(tslibDir, (p) => p.endsWith('.d.ts'));

  const filesToCopy = [...rxjsDts, ...tslibDts];

  // We'll build a list of { uri, content } entries for chunking
  const entries = [];

  for (const abs of filesToCopy) {
    const rel = relToNodeModules(abs);

    // Copy into public so it's easy to inspect/debug
    const dest = path.join(outNodeModules, rel);
    copyFile(abs, dest);

    // IMPORTANT: Monaco virtual path that TS will use for module resolution
    const uri = `file:///node_modules/${rel}`;

    // Read content (we'll embed it into chunk files)
    const content = fs.readFileSync(abs, 'utf8');

    entries.push({ uri, content });
  }

  // Preserve RxJS package.json types field (helps TS module resolution)
  const realPkg = JSON.parse(
    fs.readFileSync(path.join(rxjsDir, 'package.json'), 'utf8'),
  );

  const virtualPkgPath = path.join(outNodeModules, 'rxjs', 'package.json');
  ensureDir(path.dirname(virtualPkgPath));
  fs.writeFileSync(
    virtualPkgPath,
    JSON.stringify(
      { name: 'rxjs', types: realPkg.types || realPkg.typings },
      null,
      2,
    ),
    'utf8',
  );

  const operatorsPkgPath = path.join(
    outNodeModules,
    'rxjs',
    'operators',
    'package.json',
  );
  ensureDir(path.dirname(operatorsPkgPath));
  fs.writeFileSync(
    operatorsPkgPath,
    JSON.stringify({ name: 'rxjs/operators', types: 'index.d.ts' }, null, 2),
    'utf8',
  );

  // Chunk entries into JSON files
  const chunks = chunkArray(entries, CHUNK_COUNT);

  const chunkFiles = [];
  for (let i = 0; i < chunks.length; i++) {
    const name = `chunk-${String(i).padStart(2, '0')}.json`;
    const webPath = `monaco-dts/chunks/${name}`;
    const absPath = path.join(outChunksDir, name);

    fs.writeFileSync(absPath, JSON.stringify({ files: chunks[i] }), 'utf8');
    chunkFiles.push(webPath);
  }

  // Manifest lists chunk JSON files only
  fs.writeFileSync(
    path.join(outRoot, 'manifest.json'),
    JSON.stringify({ files: chunkFiles }, null, 2),
    'utf8',
  );

  console.log(`[monaco-dts] Copied ${filesToCopy.length} .d.ts files`);
  console.log(`[monaco-dts] Wrote ${chunkFiles.length} chunk files`);
  console.log('[monaco-dts] Done.');
}

main();
