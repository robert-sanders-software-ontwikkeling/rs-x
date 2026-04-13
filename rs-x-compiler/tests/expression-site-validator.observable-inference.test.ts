import path from 'node:path';

import ts from 'typescript';

import { validateExpressionSites } from '../lib/compiler/expression-site-validator';

const workspaceRoot = path.resolve(__dirname, '../..');

function createProgram(entryFile: string): ts.Program {
  const program = ts.createProgram({
    rootNames: [entryFile],
    options: {
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
      paths: {
        '@rs-x/core': ['./rs-x-core/lib/index.ts'],
        '@rs-x/state-manager': ['./rs-x-state-manager/lib/index.ts'],
        '@rs-x/expression-parser': ['./rs-x-expression-parser/lib/index.ts'],
      },
    },
  });

  const diagnostics = [
    ...program.getOptionsDiagnostics(),
    ...program.getGlobalDiagnostics(),
    ...program.getSyntacticDiagnostics(),
    ...program.getSemanticDiagnostics(),
  ].filter(
    (diagnostic) =>
      diagnostic.code !== 5101 &&
      (!diagnostic.file || diagnostic.file.fileName === entryFile),
  );

  if (diagnostics.length > 0) {
    const formatHost: ts.FormatDiagnosticsHost = {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => workspaceRoot,
      getNewLine: () => '\n',
    };
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost),
    );
  }

  return program;
}

describe('expression-site validation (observable constructor inference)', () => {
  it('accepts BehaviorSubject values created via constructor inference and explicit generic arguments', () => {
    const fixturePath = path.resolve(
      __dirname,
      './fixtures/semantic-observable-inference.fixture.ts',
    );
    const program = createProgram(fixturePath);
    const results = validateExpressionSites(program).filter(
      (site) => site.sourceFile.fileName === fixturePath,
    );

    expect(
      results.map((site) => ({
        expression: site.expression,
        messages: site.diagnostics.map((diagnostic) => diagnostic.message),
      })),
    ).toEqual([
      {
        expression: 'subjectNumber + 1',
        messages: [],
      },
      {
        expression: 'subjectNumberExplicit + 1',
        messages: [],
      },
      {
        expression: 'nestedSubject.y.z + count',
        messages: [],
      },
    ]);
  });
});
