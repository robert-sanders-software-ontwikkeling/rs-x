import path from 'node:path';

import { generateRsxModuleRuntime } from '../lib/rsx';

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
});
