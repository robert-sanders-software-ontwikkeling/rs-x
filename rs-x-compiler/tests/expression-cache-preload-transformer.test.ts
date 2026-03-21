import path from 'node:path';

import ts from 'typescript';

import { createExpressionCachePreloadTransformer } from '../lib/transformer';

const workspaceRoot = path.resolve(__dirname, '../..');

function createProgram(rootNames: string[]): ts.Program {
  return ts.createProgram({
    rootNames,
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

function transformSourceFile(program: ts.Program, filePath: string): string {
  const sourceFile = program.getSourceFile(filePath);
  if (!sourceFile) {
    throw new Error(`Source file not found: ${filePath}`);
  }

  const transformer = createExpressionCachePreloadTransformer(program);
  const result = ts.transform(sourceFile, [transformer]);
  const transformed = result.transformed[0] as ts.SourceFile;
  const printed = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(
    transformed,
  );
  result.dispose();

  return printed;
}

describe('expression cache preload transformer', () => {
  it('appends cache pre-registration code to files that load RsXExpressionParserModule', () => {
    const expressionsFixturePath = path.resolve(__dirname, './fixtures/transformer-expressions.fixture.ts');
    const loaderFixturePath = path.resolve(__dirname, './fixtures/transformer-loader.fixture.ts');

    const program = createProgram([expressionsFixturePath, loaderFixturePath]);
    const transformedLoader = transformSourceFile(program, loaderFixturePath);

    expect(transformedLoader).toContain(
      "const __rsxExpressionCache = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionCache);",
    );
    expect(transformedLoader).toContain(
      "__rsxExpressionCache.registerExpressionTree(\"a + b\", new AdditionExpression(",
    );
    expect(transformedLoader).toContain(
      "__rsxExpressionCache.registerExpressionTree(\"a * b\", new MultiplicationExpression(",
    );
    expect(transformedLoader).toContain('import {');
    expect(transformedLoader).toContain('AdditionExpression');
    expect(transformedLoader).toContain('MultiplicationExpression');
    expect(transformedLoader).toContain('RsXExpressionParserInjectionTokens');
  });

  it('does not append cache pre-registration code when file does not load module', () => {
    const expressionsFixturePath = path.resolve(__dirname, './fixtures/transformer-expressions.fixture.ts');
    const program = createProgram([expressionsFixturePath]);
    const transformed = transformSourceFile(program, expressionsFixturePath);

    expect(transformed).not.toContain('registerExpressionTree(');
    expect(transformed).not.toContain('__rsxExpressionCache');
  });
});
