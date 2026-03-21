import path from 'node:path';

import ts from 'typescript';

import { validateExpressionSites } from '../lib/compiler/expression-site-validator';

const workspaceRoot = path.resolve(__dirname, '../..');

function createProgram(entryFile: string): ts.Program {
  return ts.createProgram({
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
}

describe('expression-site validation', () => {
  it('validates identifier/member/function/operator semantics against model type', () => {
    const fixturePath = path.resolve(__dirname, './fixtures/semantic-validation.fixture.ts');

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
        expression: 'user.multiplier(2).total',
        messages: [],
      },
      {
        expression: 'multiply(count, 2)',
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
        expression: 'user.name * 2',
        messages: [
          'Operator "*" requires both left and right operands to be number-compatible.',
        ],
      },
      {
        expression: 'user.multiplier(2).missingTotal',
        messages: ["Identifier 'missingTotal' does not exist on model type."],
      },
    ]);
  });
});
