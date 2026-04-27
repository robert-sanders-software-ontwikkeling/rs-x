import path from 'node:path';

import ts from 'typescript';

import {
  generateRsxModuleDeclaration,
  generateRsxModuleRuntime,
} from '../lib/rsx';

const workspaceRoot = path.resolve(__dirname, '../..');

describe('.rsx module runtime generation', () => {
  it('emits named expression factories with .rsx options', () => {
    const fileName = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/expression-file-multi.fixture.rsx',
    );
    const runtime = generateRsxModuleRuntime({
      fileName,
      text: [
        'defaults:',
        "  model: import('./rsx-file-model.fixture').IModel",
        '  lazy: true',
        '  lazyGroup: shipping',
        '',
        'expression: total',
        'return: number',
        'lines.reduce((sum, line) => sum + line.lineTotal, 0)',
        '',
        'expression: firstLineName',
        'return: string',
        'compile: false',
        'lines[0].name',
      ].join('\n'),
    });

    expect(runtime).toContain("import { rsx } from '@rs-x/expression-parser';");
    expect(runtime).toContain('export const total =');
    expect(runtime).toContain('export const firstLineName =');
    expect(runtime).toContain(
      'rsx("lines.reduce((sum, line) => sum + line.lineTotal, 0)", {"preparse":true,"lazy":true,"compiled":true,"lazyGroup":"shipping"})(model, leafIndexWatchRule);',
    );
    expect(runtime).toContain(
      'rsx("lines[0].name", {"preparse":true,"lazy":true,"compiled":false,"lazyGroup":"shipping"})(model, leafIndexWatchRule);',
    );
    expect(runtime).toContain('export default total;');
  });

  it('composes same-file expression references through matching value names', () => {
    const fileName = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/expression-file-same-file-composition.fixture.rsx',
    );
    const runtime = generateRsxModuleRuntime({
      fileName,
      text: [
        'defaults:',
        '  model: { value: number }',
        '',
        'expression: subtotalRsx',
        '  value * 2',
        '',
        'expression: totalRsx',
        '  subtotal + 1',
      ].join('\n'),
    });

    expect(runtime).toContain('export const totalRsx =');
    expect(runtime).toContain(
      'rsx("subtotal + 1", {"preparse":true,"lazy":false,"compiled":true})({ ...model, "subtotal": subtotalRsx(model, leafIndexWatchRule) }, leafIndexWatchRule);',
    );
  });

  it('parses multi-line model headers and normalizes typeof expression-reference shorthand', () => {
    const fileName = path.resolve(
      workspaceRoot,
      './rs-x-compiler/tests/fixtures/expression-file-multiline-model.fixture.rsx',
    );
    const text = [
      'defaults:',
      '  model: { x: number; y: number }',
      '',
      'expression: xPlusY',
      '  return: number',
      '  x + y',
      '',
      'expression: composed',
      '  model: {',
      '    xPlusY: typeof xPlusY',
      "    importedComposed: typeof import('./test').composed",
      '  }',
      '  return: number',
      '  xPlusY * 2',
    ].join('\n');

    const declaration = generateRsxModuleDeclaration({
      fileName,
      text,
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        target: ts.ScriptTarget.ES2022,
        strict: true,
      },
      rootNames: [fileName],
    });

    expect(declaration).toContain('declare const composed');
    expect(declaration).toContain(
      "model: RsxModelInput<{\nxPlusY: ReturnType<typeof xPlusY>\nimportedComposed: ReturnType<typeof import('./test').composed>\n}>",
    );
  });
});
