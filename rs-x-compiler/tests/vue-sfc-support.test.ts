import { readFileSync } from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import { generateAotCompiledExpressionsModule } from '../lib/compiler/expression-aot-generator';
import { detectExpressionSites } from '../lib/compiler/expression-site-detector';
import {
  getRsxCompletionsAtPosition,
  getRsxDiagnosticsForFile,
} from '../lib/language-service';

const workspaceRoot = path.resolve(__dirname, '../..');

function createProgram(rootNames: string[]): ts.Program {
  return ts.createProgram({
    rootNames,
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

function findPosition(sourceText: string, needle: string): number {
  const index = sourceText.indexOf(needle);
  if (index < 0) {
    throw new Error(`Needle not found: ${needle}`);
  }

  return index;
}

describe('vue sfc support', () => {
  it('detects rsx expression sites inside <script setup lang="ts"> blocks', () => {
    const fixturePath = path.resolve(
      __dirname,
      './fixtures/vue-language-service.fixture.vue',
    );
    const modelPath = path.resolve(
      __dirname,
      './fixtures/vue-language-service-model.ts',
    );
    const program = createProgram([fixturePath, modelPath]);

    const expressions = detectExpressionSites(program)
      .filter((detection) =>
        detection.sourceFile.fileName.startsWith(fixturePath),
      )
      .map((detection) => detection.expression)
      .sort();

    expect(expressions).toEqual(['user.missing', 'user.name']);
  });

  it('returns completions and diagnostics for rsx expressions inside vue script blocks', () => {
    const fixturePath = path.resolve(
      __dirname,
      './fixtures/vue-language-service.fixture.vue',
    );
    const modelPath = path.resolve(
      __dirname,
      './fixtures/vue-language-service-model.ts',
    );
    const program = createProgram([fixturePath, modelPath]);
    const sourceText = readFileSync(fixturePath, 'utf8');

    const completionPosition =
      findPosition(sourceText, "rsx('user.name')") + "rsx('user.na".length;
    const completions = getRsxCompletionsAtPosition(
      program,
      fixturePath,
      completionPosition,
    );

    expect(completions).toEqual([{ kind: 'property', name: 'name' }]);

    const diagnostics = getRsxDiagnosticsForFile(program, fixturePath);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      category: 'semantic',
      message: "Identifier 'missing' does not exist on model type.",
    });
    expect(sourceText.slice(diagnostics[0].start, diagnostics[0].end)).toBe(
      'missing',
    );
  });

  it('includes vue script-block expressions in aot generation', () => {
    const fixturePath = path.resolve(
      __dirname,
      './fixtures/vue-language-service.fixture.vue',
    );
    const modelPath = path.resolve(
      __dirname,
      './fixtures/vue-language-service-model.ts',
    );
    const program = createProgram([fixturePath, modelPath]);

    const generated = generateAotCompiledExpressionsModule(program);

    expect(generated.expressions).toEqual(['user.missing', 'user.name']);
  });
});
