import path from 'node:path';

import ts from 'typescript';

import {
  detectExpressionSites,
  detectExpressionSitesInSourceFile,
} from '../lib/compiler/expression-site-detector';

const workspaceRoot = path.resolve(__dirname, '../..');

function createProgram(entryFile: string): ts.Program {
  return ts.createProgram({
    rootNames: [entryFile],
    options: {
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
}

describe('expression-site detection', () => {
  it('detects rsx(...) and IExpressionFactory.create(...) with static string literals', () => {
    const fixturePath = path.resolve(
      __dirname,
      './fixtures/expression-detection.fixture.ts',
    );

    const program = createProgram(fixturePath);
    const checker = program.getTypeChecker();
    const sourceFile = program.getSourceFile(fixturePath);

    expect(sourceFile).toBeDefined();

    const detections = detectExpressionSitesInSourceFile(
      sourceFile!,
      checker,
    ).map((detection) => ({
      kind: detection.kind,
      expression: detection.expression,
      preparse: detection.preparse,
      lazy: detection.lazy,
      compiled: detection.compiled,
    }));

    expect(detections).toEqual([
      {
        kind: 'rsx',
        expression: 'a + b.method().result',
        preparse: true,
        lazy: false,
        compiled: true,
      },
      {
        kind: 'rsx',
        expression: 'a + b.method().result',
        preparse: true,
        lazy: false,
        compiled: true,
      },
      {
        kind: 'rsx',
        expression: 'a + b.method().result',
        preparse: false,
        lazy: false,
        compiled: true,
      },
      {
        kind: 'rsx',
        expression: 'a + b.method().result',
        preparse: true,
        lazy: true,
        compiled: true,
      },
      {
        kind: 'rsx',
        expression: 'a + b.method().result',
        preparse: true,
        lazy: false,
        compiled: false,
      },
      {
        kind: 'factory-create',
        expression: 'a + 1',
        preparse: true,
        lazy: false,
        compiled: true,
      },
      {
        kind: 'factory-create',
        expression: 'a + 1',
        preparse: true,
        lazy: false,
        compiled: true,
      },
      {
        kind: 'factory-create',
        expression: 'a + 2',
        preparse: true,
        lazy: false,
        compiled: true,
      },
      {
        kind: 'factory-create',
        expression: 'b.method().result + 1',
        preparse: true,
        lazy: false,
        compiled: true,
      },
      {
        kind: 'factory-create',
        expression: 'b.method().result',
        preparse: true,
        lazy: false,
        compiled: true,
      },
      {
        kind: 'factory-create',
        expression: 'a',
        preparse: true,
        lazy: false,
        compiled: true,
      },
    ]);
  });

  it('does not detect local shadowed rsx function', () => {
    const fixturePath = path.resolve(
      __dirname,
      './fixtures/shadowed-rsx.fixture.ts',
    );

    const program = createProgram(fixturePath);
    const checker = program.getTypeChecker();
    const sourceFile = program.getSourceFile(fixturePath);

    expect(sourceFile).toBeDefined();

    const detections = detectExpressionSitesInSourceFile(sourceFile!, checker);

    expect(detections).toEqual([]);
  });

  it('detects from full program scan', () => {
    const fixturePath = path.resolve(
      __dirname,
      './fixtures/expression-detection.fixture.ts',
    );

    const program = createProgram(fixturePath);

    const detections = detectExpressionSites(program)
      .filter((detection) => detection.sourceFile.fileName === fixturePath)
      .map((detection) => ({
        kind: detection.kind,
        expression: detection.expression,
        preparse: detection.preparse,
        lazy: detection.lazy,
        compiled: detection.compiled,
      }));

    expect(detections).toEqual([
      {
        kind: 'rsx',
        expression: 'a + b.method().result',
        preparse: true,
        lazy: false,
        compiled: true,
      },
      {
        kind: 'rsx',
        expression: 'a + b.method().result',
        preparse: true,
        lazy: false,
        compiled: true,
      },
      {
        kind: 'rsx',
        expression: 'a + b.method().result',
        preparse: false,
        lazy: false,
        compiled: true,
      },
      {
        kind: 'rsx',
        expression: 'a + b.method().result',
        preparse: true,
        lazy: true,
        compiled: true,
      },
      {
        kind: 'rsx',
        expression: 'a + b.method().result',
        preparse: true,
        lazy: false,
        compiled: false,
      },
      {
        kind: 'factory-create',
        expression: 'a + 1',
        preparse: true,
        lazy: false,
        compiled: true,
      },
      {
        kind: 'factory-create',
        expression: 'a + 1',
        preparse: true,
        lazy: false,
        compiled: true,
      },
      {
        kind: 'factory-create',
        expression: 'a + 2',
        preparse: true,
        lazy: false,
        compiled: true,
      },
      {
        kind: 'factory-create',
        expression: 'b.method().result + 1',
        preparse: true,
        lazy: false,
        compiled: true,
      },
      {
        kind: 'factory-create',
        expression: 'b.method().result',
        preparse: true,
        lazy: false,
        compiled: true,
      },
      {
        kind: 'factory-create',
        expression: 'a',
        preparse: true,
        lazy: false,
        compiled: true,
      },
    ]);
  });
});
