const fs = require('node:fs');
const path = require('node:path');

const ts = require('../../../node_modules/typescript');

const projectRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(projectRoot, '../..');
const sourceRoot = path.join(projectRoot, 'src');
const outDir = path.join(projectRoot, 'dist');

function collectTsFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(fullPath));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

const rootNames = collectTsFiles(sourceRoot);

const compilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ES2022,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  strict: true,
  experimentalDecorators: true,
  emitDecoratorMetadata: true,
  skipLibCheck: true,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  baseUrl: repoRoot,
  paths: {
    '@rs-x/core': ['rs-x-core/lib/index.ts'],
    '@rs-x/state-manager': ['rs-x-state-manager/lib/index.ts'],
    '@rs-x/expression-parser': ['rs-x-expression-parser/lib/index.ts'],
  },
};

const program = ts.createProgram({
  rootNames,
  options: compilerOptions,
});

const diagnostics = ts
  .getPreEmitDiagnostics(program)
  .filter((diagnostic) => {
    if (!diagnostic.file) {
      return false;
    }

    return diagnostic.file.fileName.startsWith(sourceRoot);
  })
  .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);

if (diagnostics.length > 0) {
  const formatted = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (name) => name,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => '\n',
  });
  console.error(formatted);
  process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const filePath of rootNames) {
  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) {
    continue;
  }

  const transformedTs = ts
    .createPrinter({ newLine: ts.NewLineKind.LineFeed })
    .printFile(sourceFile);

  const transpiled = ts.transpileModule(transformedTs, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
    fileName: filePath,
  });

  const relativePath = path.relative(sourceRoot, filePath);
  const outputPath = path.join(outDir, relativePath).replace(/\.ts$/u, '.js');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, transpiled.outputText, 'utf8');
}

const bootstrapJsPath = path.join(outDir, 'bootstrap.js');
if (!fs.existsSync(bootstrapJsPath)) {
  console.error(`Expected output not found: ${bootstrapJsPath}`);
  process.exit(1);
}

const bootstrapJs = fs.readFileSync(bootstrapJsPath, 'utf8');
const rsxLines = bootstrapJs
  .split('\n')
  .filter((line) => line.includes('rsx('));

console.log(`Build succeeded: ${outDir}`);
console.log(`rsx(...) calls in bootstrap.js: ${rsxLines.length}`);
for (const line of rsxLines) {
  console.log(line.trim());
}
