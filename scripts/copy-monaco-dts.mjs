import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Script zit in root/scripts
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Repo root is 1 niveau omhoog
const repoRoot = path.resolve(__dirname, '..');

// 🔥 App folder aanpassen als naam anders is
const appRoot = path.join(repoRoot, 'rs-x-expression-editor');

// 🔥 BELANGRIJK: we gebruiken public/
const outRoot = path.join(appRoot, 'public', 'monaco-dts');
const outNodeModules = path.join(outRoot, 'node_modules');

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

function main() {
    console.log('[monaco-dts] Writing to:', outRoot);

    const rxjsDir = resolvePackageDir('rxjs');
    const tslibDir = resolvePackageDir('tslib');

    ensureDir(outNodeModules);

    const rxjsDts = walkFiles(rxjsDir, (p) => p.endsWith('.d.ts'));
    const tslibDts = walkFiles(tslibDir, (p) => p.endsWith('.d.ts'));

    const filesToCopy = [...rxjsDts, ...tslibDts];

    const manifest = [];

    for (const abs of filesToCopy) {
        const rel = relToNodeModules(abs);
        const dest = path.join(outNodeModules, rel);
        copyFile(abs, dest);
        manifest.push(`/monaco-dts/node_modules/${rel}`);
    }

    // 🔥 Real rxjs package.json → preserve correct "types"
    const realPkg = JSON.parse(
        fs.readFileSync(path.join(rxjsDir, 'package.json'), 'utf8')
    );

    const virtualPkgPath = path.join(outNodeModules, 'rxjs', 'package.json');
    ensureDir(path.dirname(virtualPkgPath));

    fs.writeFileSync(
        virtualPkgPath,
        JSON.stringify(
            {
                name: 'rxjs',
                types: realPkg.types || realPkg.typings,
            },
            null,
            2
        ),
        'utf8'
    );

    // operators subpath
    const operatorsPkgPath = path.join(
        outNodeModules,
        'rxjs',
        'operators',
        'package.json'
    );

    ensureDir(path.dirname(operatorsPkgPath));

    fs.writeFileSync(
        operatorsPkgPath,
        JSON.stringify(
            {
                name: 'rxjs/operators',
                types: 'index.d.ts',
            },
            null,
            2
        ),
        'utf8'
    );

    ensureDir(outRoot);
    fs.writeFileSync(
        path.join(outRoot, 'manifest.json'),
        JSON.stringify({ files: manifest }, null, 2),
        'utf8'
    );

    console.log(`[monaco-dts] Copied ${filesToCopy.length} .d.ts files`);
    console.log('[monaco-dts] Done.');
}

main();