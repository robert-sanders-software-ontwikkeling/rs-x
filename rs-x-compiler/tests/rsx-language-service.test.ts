import path from 'node:path';

import ts from 'typescript';

import {
  findRsxExpressionRegionAtPosition,
  getRsxCompletionsAtPosition,
  getRsxDiagnosticsForFile,
  getRsxHoverAtPosition,
  getRsxSignatureHelpAtPosition,
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

  it('finds expression region at position for no-substitution template literals', () => {
    const fixturePath = path.resolve(__dirname, './fixtures/language-service.fixture.ts');
    const program = createProgram(fixturePath);
    const sourceFile = program.getSourceFile(fixturePath)!;
    const position = findPosition(sourceFile, 'rsx(`user.na`)(model);') + 'rsx(`user'.length;

    const region = findRsxExpressionRegionAtPosition(
      program,
      fixturePath,
      position,
    );

    const literalStart = findPosition(sourceFile, '`user.na`');
    expect(region).toEqual({
      expression: 'user.na',
      start: literalStart + 1,
      end: literalStart + '`user.na`'.length - 1,
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
    expect(new Set(memberCompletions.map((completion) => completion.name)).size).toBe(
      memberCompletions.length,
    );

    const modularMemberPosition =
      findPosition(sourceFile, 'exprUser.na') + 'exprUser.na'.length;
    const modularMemberCompletions = getRsxCompletionsAtPosition(
      program,
      fixturePath,
      modularMemberPosition,
    );

    expect(modularMemberCompletions).toEqual([
      { kind: 'property', name: 'name' },
    ]);
    expect(
      new Set(modularMemberCompletions.map((completion) => completion.name)).size,
    ).toBe(modularMemberCompletions.length);

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
    expect(new Set(functionCompletions.map((completion) => completion.name)).size).toBe(
      functionCompletions.length,
    );

    const ternaryElsePosition =
      findPosition(sourceFile, 'a > 10 ? b.c : b.d') + 'a > 10 ? b.c : b.'.length;
    const ternaryElseCompletions = getRsxCompletionsAtPosition(
      program,
      fixturePath,
      ternaryElsePosition,
    );

    expect(ternaryElseCompletions).toEqual([
      { kind: 'property', name: 'c' },
      { kind: 'property', name: 'd' },
    ]);
    expect(new Set(ternaryElseCompletions.map((completion) => completion.name)).size).toBe(
      ternaryElseCompletions.length,
    );

    const constructorPosition =
      findPosition(sourceFile, 'a > 10 ? test(20) : new Date()') +
      'a > 10 ? test(20) : new Da'.length;
    const constructorCompletions = getRsxCompletionsAtPosition(
      program,
      fixturePath,
      constructorPosition,
    );

    expect(constructorCompletions).toContainEqual({
      kind: 'constructor',
      name: 'Date',
    });
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
      {
        category: 'semantic',
        message: "Identifier 'na' does not exist on model type.",
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

    const modularHoverPosition =
      findPosition(sourceFile, 'exprCount + 1') + 'expr'.length;
    const modularHover = getRsxHoverAtPosition(
      program,
      fixturePath,
      modularHoverPosition,
    );

    expect(modularHover).toEqual({
      text: 'number',
      start: findPosition(sourceFile, "'exprCount + 1'") + 1,
      end: findPosition(sourceFile, "'exprCount + 1'") + 1 + 'exprCount'.length,
    });
  });

  it('returns signature help for model functions inside rsx expression strings', () => {
    const fixturePath = path.resolve(__dirname, './fixtures/language-service.fixture.ts');
    const program = createProgram(fixturePath);
    const sourceFile = program.getSourceFile(fixturePath)!;

    const firstArgPosition =
      findPosition(sourceFile, 'a > 10 ? test(20) : b.c') + 'a > 10 ? test('.length;
    const firstArgHelp = getRsxSignatureHelpAtPosition(
      program,
      fixturePath,
      firstArgPosition,
    );

    expect(firstArgHelp).toEqual(
      expect.objectContaining({
        argumentIndex: 0,
        argumentCount: 0,
      }),
    );
    expect(firstArgHelp?.items[0]).toEqual(
      expect.objectContaining({
        returnTypeText: 'Date',
        parameters: [
          {
            name: 'input',
            typeText: 'number',
            isOptional: false,
            isRest: false,
          },
          {
            name: 'label',
            typeText: 'string | undefined',
            isOptional: true,
            isRest: false,
          },
        ],
      }),
    );

    const secondArgPosition =
      findPosition(sourceFile, 'a > 10 ? test(20, "x") : b.c') + 'a > 10 ? test(20, '.length;
    const secondArgHelp = getRsxSignatureHelpAtPosition(
      program,
      fixturePath,
      secondArgPosition,
    );

    expect(secondArgHelp).toEqual(
      expect.objectContaining({
        argumentIndex: 1,
        argumentCount: 2,
      }),
    );

    const constructorArgPosition =
      findPosition(sourceFile, 'a > 10 ? test(20) : new Date()') +
      'a > 10 ? test(20) : new Date('.length;
    const constructorArgHelp = getRsxSignatureHelpAtPosition(
      program,
      fixturePath,
      constructorArgPosition,
    );

    expect(constructorArgHelp).toEqual(
      expect.objectContaining({
        argumentIndex: 0,
      }),
    );
    expect(constructorArgHelp?.items.length).toBeGreaterThan(0);
  });
});
