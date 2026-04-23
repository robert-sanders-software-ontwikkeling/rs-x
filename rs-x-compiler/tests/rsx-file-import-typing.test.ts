import path from 'node:path';

import ts from 'typescript';

import { createRsxImportAwareCompilerHost } from '../lib/rsx';

const workspaceRoot = path.resolve(__dirname, '../..');

function createProgram(entryFiles: string[]): ts.Program {
  const options: ts.CompilerOptions = {
    baseUrl: workspaceRoot,
    ignoreDeprecations: '6.0',
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    skipLibCheck: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    types: ['node'],
    typeRoots: [
      path.resolve(workspaceRoot, './node_modules/@types'),
      path.resolve(workspaceRoot, './types'),
    ],
    paths: {
      '@rs-x/core': ['./rs-x-core/lib/index.ts'],
      '@rs-x/state-manager': ['./rs-x-state-manager/lib/index.ts'],
      '@rs-x/expression-parser': ['./rs-x-expression-parser/lib/index.ts'],
    },
  };

  return ts.createProgram({
    rootNames: [...entryFiles],
    options,
    host: createRsxImportAwareCompilerHost({
      options,
      rootNames: entryFiles,
    }),
  });
}

describe('.rsx file import typing', () => {
  it('allows importing and invoking .rsx modules from TypeScript files', () => {
    const rsxPath = path.resolve(
      __dirname,
      './fixtures/expression-file.fixture.rsx',
    );
    const modelPath = path.resolve(
      __dirname,
      './fixtures/rsx-file-model.fixture.ts',
    );
    const consumerPath = path.resolve(
      __dirname,
      './fixtures/rsx-file-import-consumer.fixture.ts',
    );

    const program = createProgram([rsxPath, modelPath, consumerPath]);
    const diagnostics = ts
      .getPreEmitDiagnostics(program)
      .filter((diagnostic) =>
        diagnostic.file?.fileName.endsWith(
          'rsx-file-import-consumer.fixture.ts',
        ),
      )
      .map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      );

    expect(diagnostics).toEqual([]);
  });

  it('allows named imports from multi-expression .rsx modules', () => {
    const rsxPath = path.resolve(
      __dirname,
      './fixtures/expression-file-multi.fixture.rsx',
    );
    const modelPath = path.resolve(
      __dirname,
      './fixtures/rsx-file-model.fixture.ts',
    );
    const consumerPath = path.resolve(
      __dirname,
      './fixtures/rsx-file-multi-import-consumer.fixture.ts',
    );

    const program = createProgram([rsxPath, modelPath, consumerPath]);
    const diagnostics = ts
      .getPreEmitDiagnostics(program)
      .filter((diagnostic) =>
        diagnostic.file?.fileName.endsWith(
          'rsx-file-multi-import-consumer.fixture.ts',
        ),
      )
      .map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      );

    expect(diagnostics).toEqual([]);
  });
});
