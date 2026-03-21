import path from 'node:path';

import ts from 'typescript';

import {
  findRsxExpressionRegionAtPosition,
  getRsxCompletionsAtPosition,
  getRsxDiagnosticsForFile,
  getRsxHoverAtPosition,
} from '../lib/language-service';

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

function findPosition(sourceFile: ts.SourceFile, needle: string): number {
  const index = sourceFile.getFullText().indexOf(needle);
  if (index === -1) {
    throw new Error(`Needle not found: ${needle}`);
  }

  return index;
}

describe('rsx language service', () => {
  it('finds expression region at position', () => {
    const fixturePath = path.resolve(__dirname, './fixtures/language-service.fixture.ts');
    const program = createProgram(fixturePath);
    const sourceFile = program.getSourceFile(fixturePath)!;
    const position = findPosition(sourceFile, 'user.na') + 2;

    const region = findRsxExpressionRegionAtPosition(
      program,
      fixturePath,
      position,
    );

    expect(region).toEqual({
      expression: 'user.na',
      start: findPosition(sourceFile, "'user.na'") + 1,
      end: findPosition(sourceFile, "'user.na'") + "'user.na'".length - 1,
    });
  });

  it('returns completions from model type for member access and function return type', () => {
    const fixturePath = path.resolve(__dirname, './fixtures/language-service.fixture.ts');
    const program = createProgram(fixturePath);
    const sourceFile = program.getSourceFile(fixturePath)!;

    const memberPosition = findPosition(sourceFile, 'user.na') + 'user.na'.length;
    const memberCompletions = getRsxCompletionsAtPosition(
      program,
      fixturePath,
      memberPosition,
    );

    expect(memberCompletions).toEqual([
      { kind: 'property', name: 'name' },
    ]);

    const functionPosition =
      findPosition(sourceFile, 'user.stats().to') + 'user.stats().to'.length;
    const functionCompletions = getRsxCompletionsAtPosition(
      program,
      fixturePath,
      functionPosition,
    );

    expect(functionCompletions).toEqual([
      { kind: 'property', name: 'total' },
    ]);
  });

  it('returns diagnostics for syntax and semantic issues', () => {
    const fixturePath = path.resolve(__dirname, './fixtures/language-service.fixture.ts');
    const program = createProgram(fixturePath);
    const diagnostics = getRsxDiagnosticsForFile(program, fixturePath);

    expect(
      diagnostics.map((diagnostic) => ({
        category: diagnostic.category,
        message: diagnostic.message,
      })),
    ).toEqual([
      {
        category: 'semantic',
        message: "Identifier 'na' does not exist on model type.",
      },
      {
        category: 'semantic',
        message: "Identifier 'to' does not exist on model type.",
      },
      {
        category: 'syntax',
        message: "Missing right operand for 'count +'.",
      },
    ]);
  });

  it('returns hover type info for identifiers inside rsx expression strings', () => {
    const fixturePath = path.resolve(__dirname, './fixtures/language-service.fixture.ts');
    const program = createProgram(fixturePath);
    const sourceFile = program.getSourceFile(fixturePath)!;
    const hoverPosition = findPosition(sourceFile, 'user.name') + 'user.'.length;

    const hover = getRsxHoverAtPosition(program, fixturePath, hoverPosition);

    expect(hover).toEqual({
      text: 'string',
      start: findPosition(sourceFile, "'user.name'") + 1 + 'user.'.length,
      end: findPosition(sourceFile, "'user.name'") + 1 + 'user.name'.length,
    });
  });
});
