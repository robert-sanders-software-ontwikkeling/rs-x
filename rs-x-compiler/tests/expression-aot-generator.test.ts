import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import ts from 'typescript';

import {
  generateAotCompiledExpressionsModule,
  generateAotLazyExpressionsModule,
  generateAotLazyExpressionPreloadManifestModule,
  generateAotParsedExpressionCacheModule,
} from '../lib/compiler/expression-aot-generator';

const workspaceRoot = path.resolve(__dirname, '../..');

function createProgram(entryFile: string | string[]): ts.Program {
  return ts.createProgram({
    rootNames: Array.isArray(entryFile) ? entryFile : [entryFile],
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
}

describe('AOT compiled expression generator', () => {
  const runHeavySizeTest = process.env.RSX_RUN_HEAVY_AOT_SIZE_TEST === '1';
  it('generates module code for static rsx expressions', async () => {
    const fixtureDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'rsx-aot-generator-basic-'),
    );
    const fixturePath = path.join(fixtureDir, 'basic.fixture.ts');

    await fs.writeFile(
      fixturePath,
      `
import { rsx } from '@rs-x/expression-parser';
const model = { a: 1, b: 2 };
rsx('a + b')(model);
rsx('a + b')(model);
rsx('a * b')(model);
`,
      'utf8',
    );

    const program = createProgram(fixturePath);
    const generated = generateAotCompiledExpressionsModule(program);

    expect(generated.expressions).toEqual(['a * b', 'a + b']);
    expect(generated.skippedExpressions).toEqual([]);
    expect(generated.code).toContain('registerRsxAotCompiledExpressions');
    expect(generated.code).toContain('a + b');
    expect(generated.code).toContain('a * b');
  });

  it('can include evaluateResolvedDependencies in generated compact plans', async () => {
    const fixtureDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'rsx-aot-generator-resolved-eval-'),
    );
    const fixturePath = path.join(fixtureDir, 'resolved-eval.fixture.ts');

    await fs.writeFile(
      fixturePath,
      `
import { rsx } from '@rs-x/expression-parser';
const model = { a: 1, b: 2 };
rsx('a + b')(model);
`,
      'utf8',
    );

    const program = createProgram(fixturePath);
    const generated = generateAotCompiledExpressionsModule(program, {
      includeResolvedEvaluator: true,
    });

    expect(generated.expressions).toEqual(['a + b']);
    expect(generated.code).toContain(
      'expandCompactCompiledPlans(compactPlans, true)',
    );
    expect(generated.code).toContain('wrapForRuntimeEvaluation');
  });

  it('includes imported const expressions in compiled AOT generation', async () => {
    const fixtureDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'rsx-aot-generator-imported-compiled-'),
    );
    const expressionsPath = path.join(fixtureDir, 'expressions.ts');
    const consumerPath = path.join(fixtureDir, 'consumer.ts');

    await fs.writeFile(
      expressionsPath,
      `
export const sharedCompiledExpression = 'a + b';
`,
      'utf8',
    );

    await fs.writeFile(
      consumerPath,
      `
import { rsx } from '@rs-x/expression-parser';
import { sharedCompiledExpression } from './expressions';

const model = { a: 1, b: 2 };
rsx(sharedCompiledExpression)(model);
`,
      'utf8',
    );

    const program = createProgram([expressionsPath, consumerPath]);
    const generated = generateAotCompiledExpressionsModule(program);

    expect(generated.expressions).toEqual(['a + b']);
    expect(generated.skippedExpressions).toEqual([]);
    expect(generated.code).toContain('a + b');
  });

  it('includes .rsx file expressions in compiled AOT generation', async () => {
    const fixturePath = path.resolve(
      __dirname,
      './fixtures/expression-file.fixture.rsx',
    );
    const modelPath = path.resolve(
      __dirname,
      './fixtures/rsx-file-model.fixture.ts',
    );

    const program = createProgram([fixturePath, modelPath]);
    const generated = generateAotCompiledExpressionsModule(program);

    expect(generated.expressions).toEqual([
      'lines.reduce((sum, line) => sum + line.lineTotal, 0)',
    ]);
    expect(generated.skippedExpressions).toEqual([]);
  });

  it('skips expressions with rsx preparse disabled', async () => {
    const fixtureDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'rsx-aot-generator-preparse-flag-'),
    );
    const fixturePath = path.join(fixtureDir, 'preparse-flag.fixture.ts');

    await fs.writeFile(
      fixturePath,
      `
import { rsx } from '@rs-x/expression-parser';
const model = { a: 1, b: 2, c: 3, d: 4 };
rsx('a + b')(model);
rsx('b + c', { preparse: false })(model);
rsx('c + d', { lazy: true })(model);
rsx('d + a', { compiled: false })(model);
`,
      'utf8',
    );

    const program = createProgram(fixturePath);
    const generated = generateAotCompiledExpressionsModule(program);

    expect(generated.expressions).toEqual(['a + b']);
    expect(generated.skippedExpressions).toEqual([]);
    expect(generated.code).toContain('a + b');
    expect(generated.code).not.toContain('b + c');
    expect(generated.code).not.toContain('c + d');
    expect(generated.code).not.toContain('d + a');
  });

  (runHeavySizeTest ? it : it.skip)(
    'reports generated code size for 10,000 expressions with 100 identifiers',
    async () => {
      const fixtureDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'rsx-aot-generator-size-'),
      );
      const fixturePath = path.join(fixtureDir, 'size.fixture.ts');

      const identifiers = Array.from({ length: 100 }, (_, i) => `x${i}`);
      const baseExpression = identifiers.join(' + ');
      const lines: string[] = [];
      lines.push("import { rsx } from '@rs-x/expression-parser';");
      lines.push('const model: Record<string, number> = {};');
      for (let i = 0; i < identifiers.length; i++) {
        lines.push(`model.${identifiers[i]} = ${i};`);
      }
      for (let i = 0; i < 10000; i++) {
        lines.push(`rsx('${baseExpression} + ${i}')(model);`);
      }

      await fs.writeFile(fixturePath, `${lines.join('\n')}\n`, 'utf8');

      const program = createProgram(fixturePath);
      const generated = generateAotCompiledExpressionsModule(program);
      const bytes = Buffer.byteLength(generated.code, 'utf8');
      const megabytes = bytes / (1024 * 1024);

      expect(generated.expressions.length).toBe(10000);
      expect(generated.skippedExpressions.length).toBe(0);
      expect(bytes).toBeGreaterThan(0);

      console.info(
        `[aot-size] expressions=${generated.expressions.length} bytes=${bytes} mb=${megabytes.toFixed(2)}`,
      );
    },
    120000,
  );
});

describe('AOT parsed expression cache generator', () => {
  const runHeavySizeTest = process.env.RSX_RUN_HEAVY_AOT_SIZE_TEST === '1';
  it('generates module code for static rsx expressions', async () => {
    const fixtureDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'rsx-aot-generator-basic-parsed-'),
    );
    const fixturePath = path.join(fixtureDir, 'basic.fixture.ts');

    await fs.writeFile(
      fixturePath,
      `
import { rsx } from '@rs-x/expression-parser';
const model = { a: 1, b: 2 };
rsx('a + b')(model);
rsx('a + b')(model);
rsx('a * b')(model);
`,
      'utf8',
    );

    const program = createProgram(fixturePath);
    const generated = generateAotParsedExpressionCacheModule(program);

    expect(generated.expressions).toEqual(['a * b', 'a + b']);
    expect(generated.skippedExpressions).toEqual([]);
    expect(generated.code).toContain('registerRsxAotParsedExpressionCache');
    expect(generated.code).toContain('registerPreparsedExpressionAsts');
    expect(generated.code).toContain('@rs-x/expression-parser/aot-runtime');
    expect(generated.code).toContain('BinaryExpression');
  });

  it('includes imported const expressions in parsed/preparsed AOT generation', async () => {
    const fixtureDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'rsx-aot-generator-imported-parsed-'),
    );
    const expressionsPath = path.join(fixtureDir, 'expressions.ts');
    const consumerPath = path.join(fixtureDir, 'consumer.ts');

    await fs.writeFile(
      expressionsPath,
      `
export const sharedParsedExpression = 'a + b';
`,
      'utf8',
    );

    await fs.writeFile(
      consumerPath,
      `
import { rsx } from '@rs-x/expression-parser';
import { sharedParsedExpression } from './expressions';

const model = { a: 1, b: 2 };
rsx(sharedParsedExpression)(model);
`,
      'utf8',
    );

    const program = createProgram([expressionsPath, consumerPath]);
    const generated = generateAotParsedExpressionCacheModule(program);

    expect(generated.expressions).toEqual(['a + b']);
    expect(generated.skippedExpressions).toEqual([]);
    expect(generated.code).toContain('registerPreparsedExpressionAsts');
    expect(generated.code).toContain('BinaryExpression');
  });

  it('includes .rsx file expressions in parsed/preparsed AOT generation', async () => {
    const fixturePath = path.resolve(
      __dirname,
      './fixtures/expression-file.fixture.rsx',
    );
    const modelPath = path.resolve(
      __dirname,
      './fixtures/rsx-file-model.fixture.ts',
    );

    const program = createProgram([fixturePath, modelPath]);
    const generated = generateAotParsedExpressionCacheModule(program);

    expect(generated.expressions).toEqual([
      'lines.reduce((sum, line) => sum + line.lineTotal, 0)',
    ]);
    expect(generated.skippedExpressions).toEqual([]);
  });

  it('skips expressions with rsx preparse disabled', async () => {
    const fixtureDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'rsx-aot-generator-parsed-preparse-flag-'),
    );
    const fixturePath = path.join(fixtureDir, 'preparse-flag.fixture.ts');

    await fs.writeFile(
      fixturePath,
      `
import { rsx } from '@rs-x/expression-parser';
const model = { a: 1, b: 2, c: 3, d: 4 };
rsx('a + b')(model);
rsx('b + c', { preparse: false })(model);
rsx('c + d', { lazy: true })(model);
rsx('d + a', { compiled: false })(model);
`,
      'utf8',
    );

    const program = createProgram(fixturePath);
    const generated = generateAotParsedExpressionCacheModule(program);

    expect(generated.expressions).toEqual(['a + b', 'd + a']);
    expect(generated.skippedExpressions).toEqual([]);
    expect(generated.code).toContain('a + b');
    expect(generated.code).not.toContain('b + c');
    expect(generated.code).not.toContain('c + d');
    expect(generated.code).toContain('d + a');
  });

  (runHeavySizeTest ? it : it.skip)(
    'reports generated code size for 10,000 expressions with 100 identifiers',
    async () => {
      const fixtureDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'rsx-aot-generator-size-parsed-'),
      );
      const fixturePath = path.join(fixtureDir, 'size.fixture.ts');

      const identifiers = Array.from({ length: 100 }, (_, i) => `x${i}`);
      const baseExpression = identifiers.join(' + ');
      const lines: string[] = [];
      lines.push("import { rsx } from '@rs-x/expression-parser';");
      lines.push('const model: Record<string, number> = {};');
      for (let i = 0; i < identifiers.length; i++) {
        lines.push(`model.${identifiers[i]} = ${i};`);
      }
      for (let i = 0; i < 10000; i++) {
        lines.push(`rsx('${baseExpression} + ${i}')(model);`);
      }

      await fs.writeFile(fixturePath, `${lines.join('\n')}\n`, 'utf8');

      const program = createProgram(fixturePath);
      const generated = generateAotParsedExpressionCacheModule(program);
      const bytes = Buffer.byteLength(generated.code, 'utf8');
      const megabytes = bytes / (1024 * 1024);

      expect(generated.expressions.length).toBe(10000);
      expect(generated.skippedExpressions.length).toBe(0);
      expect(bytes).toBeGreaterThan(0);

      console.info(
        `[aot-size-parsed-cache] expressions=${generated.expressions.length} bytes=${bytes} mb=${megabytes.toFixed(2)}`,
      );
    },
    120000,
  );
});

describe('AOT lazy expression generator', () => {
  it('emits self-contained lazy payload modules without bare package imports', async () => {
    const fixtureDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'rsx-aot-generator-lazy-self-contained-'),
    );
    const fixturePath = path.join(fixtureDir, 'lazy.fixture.ts');

    await fs.writeFile(
      fixturePath,
      `
import { rsx } from '@rs-x/expression-parser';
const model = { a: 1, b: 2 };
rsx('a + b', { lazy: true })(model);
`,
      'utf8',
    );

    const program = createProgram(fixturePath);
    const generated = generateAotLazyExpressionsModule(program);

    expect(generated.code).toContain('expandCompactCompiledPlans');
    expect(generated.code).toContain('deserializeCompactMemberChain');
    expect(generated.code).not.toContain('@rs-x/expression-parser/aot-runtime');
  });
});

describe('AOT lazy expression preload manifest generator', () => {
  it('registers ungrouped lazy expressions via the group mechanism with __rsx_ungrouped__ sentinel', async () => {
    const fixtureDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'rsx-aot-generator-lazy-manifest-group-'),
    );
    const fixturePath = path.join(fixtureDir, 'lazy-manifest-group.fixture.ts');

    await fs.writeFile(
      fixturePath,
      `
import { rsx } from '@rs-x/expression-parser';
const model = { a: 1, b: 2, c: 3 };
rsx('a + b')(model);
rsx('b + c', { lazy: true })(model);
rsx('a + c', { lazy: true })(model);
`,
      'utf8',
    );

    const program = createProgram(fixturePath);
    const generated = generateAotLazyExpressionPreloadManifestModule(program);

    // Both lazy expressions should be in the manifest
    expect(generated.expressions).toEqual(['a + c', 'b + c']);
    // Uses group-based registration, not per-expression preloaders
    expect(generated.code).toContain('registerLazyExpressionInGroup');
    expect(generated.code).toContain("'__rsx_ungrouped__'");
    expect(generated.code).toContain('registerLazyExpressionGroupPreloader');
    expect(generated.code).not.toContain('registerLazyExpressionPreloader');
    // Each expression registered into the group
    expect(generated.code).toContain('"a + c"');
    expect(generated.code).toContain('"b + c"');
    // Non-lazy not in manifest
    expect(generated.code).not.toContain('"a + b"');
  });

  it('emits lazy manifest entries only for rsx calls with lazy: true', async () => {
    const fixtureDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'rsx-aot-generator-lazy-manifest-'),
    );
    const fixturePath = path.join(fixtureDir, 'lazy-manifest.fixture.ts');

    await fs.writeFile(
      fixturePath,
      `
import { rsx } from '@rs-x/expression-parser';
const model = { a: 1, b: 2, c: 3, d: 4 };
rsx('a + b')(model);
rsx('b + c', { lazy: true })(model);
rsx('c + d', { lazy: true, preparse: true })(model);
rsx('d + a', { preparse: false, lazy: true })(model);
rsx('a + c', { preparse: false, compiled: false, lazy: true })(model);
`,
      'utf8',
    );

    const program = createProgram(fixturePath);
    const generated = generateAotLazyExpressionPreloadManifestModule(program);

    expect(generated.expressions).toEqual(['b + c', 'c + d', 'd + a']);
    expect(generated.code).toContain('registerRsxAotLazyExpressionPreloaders');
    expect(generated.code).toContain('@rs-x/expression-parser/aot-runtime');
    expect(generated.code).toContain('b + c');
    expect(generated.code).toContain('c + d');
    expect(generated.code).toContain('d + a');
    expect(generated.code).not.toContain('a + b');
    expect(generated.code).not.toContain('a + c');
  });
});

describe('AOT lazy expression payload generator', () => {
  it('emits lazy preparsed and compiled payloads for lazy rsx calls', async () => {
    const fixtureDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'rsx-aot-generator-lazy-payload-'),
    );
    const fixturePath = path.join(fixtureDir, 'lazy-payload.fixture.ts');

    await fs.writeFile(
      fixturePath,
      `
import { rsx } from '@rs-x/expression-parser';
const model = { a: 1, b: 2, c: 3, d: 4 };
rsx('a + b')(model);
rsx('b + c', { lazy: true })(model);
rsx('c + d', { lazy: true, preparse: true })(model);
rsx('d + a', { lazy: true, compiled: false })(model);
rsx('a + c', { lazy: true, preparse: false })(model);
rsx('b + d', { lazy: true, preparse: false, compiled: false })(model);
`,
      'utf8',
    );

    const program = createProgram(fixturePath);
    const generated = generateAotLazyExpressionsModule(program);

    expect(generated.expressions).toEqual(['a + c', 'b + c', 'c + d', 'd + a']);
    expect(generated.compiledExpressions).toEqual(['a + c', 'b + c', 'c + d']);
    expect(generated.skippedCompiledExpressions).toEqual([]);
    expect(generated.skippedPreparsedExpressions).toEqual([]);
    expect(generated.groups).toEqual({});
    expect(generated.code).toContain('registerRsxAotLazyExpressions');
    expect(generated.code).toContain('registerPreparsedExpressionAsts');
    expect(generated.code).toContain(
      'registerCompiledExpressionPlansInExpressionCache',
    );
    expect(generated.code).toContain('expandCompactCompiledPlans');
    expect(generated.code).not.toContain('function deserializeMemberChain');
    expect(generated.code).toContain('b + c');
    expect(generated.code).toContain('c + d');
    expect(generated.code).toContain('d + a');
    expect(generated.code).toContain('a + c');
    expect(generated.code).not.toContain('a + b');
    expect(generated.code).not.toContain('b + d');
  });

  it('throws when lazyGroup is set to the reserved __rsx_ungrouped__ sentinel', async () => {
    const fixtureDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'rsx-aot-generator-reserved-group-'),
    );
    const fixturePath = path.join(fixtureDir, 'reserved-group.fixture.ts');

    await fs.writeFile(
      fixturePath,
      `
import { rsx } from '@rs-x/expression-parser';
const model = { a: 1, b: 2 };
rsx('a + b', { lazyGroup: '__rsx_ungrouped__' })(model);
`,
      'utf8',
    );

    const program = createProgram(fixturePath);
    expect(() => generateAotLazyExpressionsModule(program)).toThrow(
      '__rsx_ungrouped__',
    );
  });

  it('emits per-group registration functions for lazyGroup expressions', async () => {
    const fixtureDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'rsx-aot-generator-lazy-group-'),
    );
    const fixturePath = path.join(fixtureDir, 'lazy-group.fixture.ts');

    await fs.writeFile(
      fixturePath,
      `
import { rsx } from '@rs-x/expression-parser';
const model = { a: 1, b: 2, c: 3, d: 4 };
rsx('a + b')(model);
rsx('b + c', { lazyGroup: 'panel' })(model);
rsx('c + d', { lazyGroup: 'panel' })(model);
rsx('d + a', { lazyGroup: 'admin' })(model);
rsx('a + c', { lazy: true })(model);
`,
      'utf8',
    );

    const program = createProgram(fixturePath);
    const generated = generateAotLazyExpressionsModule(program);

    // ungrouped lazy
    expect(generated.expressions).toEqual(['a + c']);
    // groups
    expect(generated.groups).toEqual({
      admin: ['d + a'],
      panel: ['b + c', 'c + d'],
    });
    expect(Object.keys(generated.groupModules).sort()).toEqual([
      'admin',
      'panel',
    ]);
    // ungrouped expressions are in the lazy block
    expect(generated.code).toContain('registerRsxAotLazyExpressions');
    expect(generated.code).toContain('a + c');
    expect(generated.code).not.toContain('b + c');
    expect(generated.code).not.toContain('c + d');
    expect(generated.code).not.toContain('d + a');
    // grouped expressions move into their own payload modules
    expect(generated.groupModules.panel.code).toContain(
      'registerRsxAotLazyExpressions',
    );
    expect(generated.groupModules.panel.code).toContain(
      'expandCompactCompiledPlans',
    );
    expect(generated.groupModules.panel.code).not.toContain(
      'function deserializeMemberChain',
    );
    expect(generated.groupModules.panel.code).toContain('b + c');
    expect(generated.groupModules.panel.code).toContain('c + d');
    expect(generated.groupModules.panel.code).not.toContain('a + c');
    expect(generated.groupModules.admin.code).toContain(
      'registerRsxAotLazyExpressions',
    );
    expect(generated.groupModules.admin.code).toContain(
      'expandCompactCompiledPlans',
    );
    expect(generated.groupModules.admin.code).not.toContain(
      'function deserializeMemberChain',
    );
    expect(generated.groupModules.admin.code).toContain('d + a');
    expect(generated.groupModules.admin.code).not.toContain('a + c');
    // non-lazy not included
    expect(generated.code).not.toContain('a + b');
  });
});
