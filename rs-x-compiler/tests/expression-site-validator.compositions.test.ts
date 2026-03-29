import path from 'node:path';

import ts from 'typescript';

import { validateExpressionSites } from '../lib/compiler/expression-site-validator';

const workspaceRoot = path.resolve(__dirname, '../..');

function createProgram(entryFile: string): ts.Program {
  const program = ts.createProgram({
    rootNames: [entryFile],
    options: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      strict: true,
      skipLibCheck: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      baseUrl: workspaceRoot,
      types: ['node'],
      paths: {
        '@rs-x/core': ['rs-x-core/lib/index.ts'],
        '@rs-x/state-manager': ['rs-x-state-manager/lib/index.ts'],
        '@rs-x/expression-parser': ['rs-x-expression-parser/lib/index.ts'],
      },
    },
  });

  assertNoTypeScriptDiagnostics(program, entryFile);
  return program;
}

function assertNoTypeScriptDiagnostics(
  program: ts.Program,
  entryFile: string,
): void {
  const diagnostics = [
    ...program.getOptionsDiagnostics(),
    ...program.getGlobalDiagnostics(),
    ...program.getSyntacticDiagnostics(),
    ...program.getSemanticDiagnostics(),
  ].filter(
    (diagnostic) => !diagnostic.file || diagnostic.file.fileName === entryFile,
  );

  if (diagnostics.length === 0) {
    return;
  }

  const formatHost: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => workspaceRoot,
    getNewLine: () => '\n',
  };

  throw new Error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost),
  );
}

function diagnosticsByExpression(
  fixturePath: string,
): Map<string, readonly string[]> {
  const program = createProgram(fixturePath);
  const results = validateExpressionSites(program).filter(
    (site) => site.sourceFile.fileName === fixturePath,
  );

  return new Map(
    results.map((site) => [
      site.expression,
      site.diagnostics.map((diagnostic) => diagnostic.message),
    ]),
  );
}

describe('expression-site validation (compositions)', () => {
  it('handles template literals and composed expressions with expected diagnostics', () => {
    const fixturePath = path.resolve(
      __dirname,
      './fixtures/semantic-compositions.fixture.ts',
    );
    const results = diagnosticsByExpression(fixturePath);

    expect(results.get('`hello ${user.name}`')).toEqual([]);
    expect(
      results.get('count > 0 ? user.multiplier(count).total : map[key]'),
    ).toEqual([]);
    expect(
      results.get(
        'count > 0 && user.multiplier(count).total > 10 ? items[index] : lookup[key]',
      ),
    ).toEqual([]);
    expect(results.get('lookup[key] ?? items[index]')).toEqual([]);
    expect(results.get('!isArchived || user.name == "admin"')).toEqual([]);

    expect(results.get('`hello ${user.unknown}`')).toContain(
      "Identifier 'unknown' does not exist on model type.",
    );
    expect(
      results.get('count > 0 ? user.multiplier("x").total : map[key]'),
    ).toContain("Arguments for 'multiplier' do not match any call signature.");

    const templateSyntaxMessages = results.get('`hello ${user.name`') ?? [];
    expect(templateSyntaxMessages.length).toBeGreaterThan(0);

    const nestedTemplateSyntaxMessages =
      results.get('`hello ${message(a.b }`') ?? [];
    expect(nestedTemplateSyntaxMessages.length).toBeGreaterThan(0);
  });
});
