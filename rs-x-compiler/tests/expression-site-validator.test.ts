import path from 'node:path';

import ts from 'typescript';

import { validateExpressionSites } from '../lib/compiler/expression-site-validator';

const workspaceRoot = path.resolve(__dirname, '../..');

function createProgram(
  entryFile: string,
  additionalTypes: readonly string[] = [],
): ts.Program {
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
      types: ['node', ...additionalTypes],
      paths: {
        '@rs-x/core': ['./rs-x-core/lib/index.ts'],
        '@rs-x/state-manager': ['./rs-x-state-manager/lib/index.ts'],
        '@rs-x/expression-parser': ['./rs-x-expression-parser/lib/index.ts'],
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
    (diagnostic) =>
      diagnostic.code !== 5101 &&
      (!diagnostic.file || diagnostic.file.fileName === entryFile),
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

describe('expression-site validation', () => {
  it('validates identifier/member/function/operator semantics against model type', () => {
    const fixturePath = path.resolve(
      __dirname,
      './fixtures/semantic-validation.fixture.ts',
    );

    const program = createProgram(fixturePath);
    const results = validateExpressionSites(program)
      .filter((site) => site.sourceFile.fileName === fixturePath)
      .map((site) => ({
        expression: site.expression,
        messages: site.diagnostics.map((diagnostic) => diagnostic.message),
      }));

    expect(results).toEqual([
      {
        expression: 'count * 2',
        messages: [],
      },
      {
        expression: '(count + 2) * 3',
        messages: [],
      },
      {
        expression: 'user.name + "!"',
        messages: [],
      },
      {
        expression: 'user.multiplier(2).total',
        messages: [],
      },
      {
        expression: 'items[1]',
        messages: [],
      },
      {
        expression: 'lookup["a"]',
        messages: [],
      },
      {
        expression: 'items[index]',
        messages: [],
      },
      {
        expression: 'lookup[key]',
        messages: [],
      },
      {
        expression: 'nestedA.map[key]',
        messages: [],
      },
      {
        expression: 'map["b"]',
        messages: [],
      },
      {
        expression: 'map[key]',
        messages: [],
      },
      {
        expression: 'tasks[taskId]',
        messages: [],
      },
      {
        expression: 'invoiceDate.year',
        messages: [],
      },
      {
        expression: 'x.y.z',
        messages: [],
      },
      {
        expression: 'nestedObservablePath.y.z',
        messages: [],
      },
      {
        expression: 'obsNumber + 1',
        messages: [],
      },
      {
        expression: 'subjNumber + 1',
        messages: [],
      },
      {
        expression: 'replayNumber + 1',
        messages: [],
      },
      {
        expression: 'getNumber$() + 1',
        messages: [],
      },
      {
        expression: 'a.b.c.d',
        messages: [],
      },
      {
        expression: 'cart.first().qty',
        messages: [],
      },
      {
        expression: 'lines.reduce((sum, line) => sum + line.lineTotal, 0)',
        messages: [],
      },
      {
        expression: 'applyToLineTotals((sum, line) => sum + line.lineTotal, 0)',
        messages: [],
      },
      {
        expression: 'multiply(count, 2)',
        messages: [],
      },
      {
        expression: 'x1 * 3',
        messages: [],
      },
      {
        expression: 'xObj.total * 2',
        messages: [],
      },
      {
        expression: 'missing',
        messages: ["Identifier 'missing' does not exist on model type."],
      },
      {
        expression: 'user.unknown',
        messages: ["Identifier 'unknown' does not exist on model type."],
      },
      {
        expression: 'user.multiplier("2").total',
        messages: [
          "Arguments for 'multiplier' do not match any call signature.",
        ],
      },
      {
        expression: 'applyToLineTotals("invalid", 0)',
        messages: [
          "Arguments for 'applyToLineTotals' do not match any call signature.",
        ],
      },
      {
        expression: 'user.name * 2',
        messages: [
          'Operator "*" requires both left and right operands to be number-compatible.',
        ],
      },
      {
        expression: 'count + true',
        messages: [
          'Operator "+" requires compatible operands (both number-like or at least one string-like).',
        ],
      },
      {
        expression: '+user.name',
        messages: [
          'Unary numeric operator requires a number-compatible operand.',
        ],
      },
      {
        expression: 'count - user.name',
        messages: [
          'Operator "-" requires both left and right operands to be number-compatible.',
        ],
      },
      {
        expression: 'x2 * 3',
        messages: [
          'Operator "*" requires both left and right operands to be number-compatible.',
        ],
      },
      {
        expression: 'user.multiplier(2).missingTotal',
        messages: ["Identifier 'missingTotal' does not exist on model type."],
      },
      {
        expression: 'new Date()',
        messages: [],
      },
    ]);
  });

  it('accepts all DatePropertyAccessor properties on Date model fields', () => {
    const fixturePath = path.resolve(
      __dirname,
      './fixtures/date-properties-validation.fixture.ts',
    );

    const program = createProgram(fixturePath);
    const results = validateExpressionSites(program)
      .filter((site) => site.sourceFile.fileName === fixturePath)
      .map((site) => ({
        expression: site.expression,
        messages: site.diagnostics.map((diagnostic) => diagnostic.message),
      }));

    expect(results).toEqual([
      { expression: 'invoiceDate.year', messages: [] },
      { expression: 'invoiceDate.utcYear', messages: [] },
      { expression: 'invoiceDate.month', messages: [] },
      { expression: 'invoiceDate.utcMonth', messages: [] },
      { expression: 'invoiceDate.date', messages: [] },
      { expression: 'invoiceDate.utcDate', messages: [] },
      { expression: 'invoiceDate.hours', messages: [] },
      { expression: 'invoiceDate.utcHours', messages: [] },
      { expression: 'invoiceDate.minutes', messages: [] },
      { expression: 'invoiceDate.utcMinutes', messages: [] },
      { expression: 'invoiceDate.seconds', messages: [] },
      { expression: 'invoiceDate.utcSeconds', messages: [] },
      { expression: 'invoiceDate.milliseconds', messages: [] },
      { expression: 'invoiceDate.utcMilliseconds', messages: [] },
      { expression: 'invoiceDate.time', messages: [] },
    ]);
  });
});
