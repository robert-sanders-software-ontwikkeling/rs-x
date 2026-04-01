import { performance } from 'node:perf_hooks';

import { InjectionContainer } from '@rs-x/core';

import { generatedBenchmarkExpressionStrings } from '../../lib/benchmark/generated-benchmark-expression-strings';
import type { ICompiledExpressionCompiler } from '../../lib/compiled-expression/compiled-expression.compiler.interface';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function loadGeneratedExpressionStrings(maxCount: number): string[] {
  return generatedBenchmarkExpressionStrings.slice(0, maxCount);
}

describe('CompiledExpressionCompiler benchmark', () => {
  beforeAll(async () => {
    jest.setTimeout(120000);
    await InjectionContainer.load(RsXExpressionParserModule);
  });

  afterAll(async () => {
    await unloadRsXExpressionParserModule();
  });

  it('profiles compile cost for generated expressions', () => {
    const maxCount = readPositiveIntegerEnv('RSX_BENCHMARK_MAX_COUNT', 1000);
    const expressionStrings = loadGeneratedExpressionStrings(maxCount);
    expect(expressionStrings.length).toBeGreaterThan(0);

    const compiler = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.ICompiledExpressionCompiler,
    ) as ICompiledExpressionCompiler;

    const startMs = performance.now();
    for (let i = 0; i < expressionStrings.length; i += 1) {
      compiler.tryCompile(expressionStrings[i]);
    }
    const compileMs = performance.now() - startMs;

    if (process.env.RSX_BENCHMARK_LOG === 'true') {
      console.log(
        `[compiled-compiler] count=${expressionStrings.length} compileMs=${Number(compileMs.toFixed(2))}`,
      );
    }

    expect(compileMs).toBeGreaterThan(0);
  });

  it('profiles cache hit cost for repeated compilation', () => {
    const maxCount = readPositiveIntegerEnv('RSX_BENCHMARK_MAX_COUNT', 1000);
    const expressionStrings = loadGeneratedExpressionStrings(maxCount);
    expect(expressionStrings.length).toBeGreaterThan(0);

    const compiler = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.ICompiledExpressionCompiler,
    ) as ICompiledExpressionCompiler;

    for (let i = 0; i < expressionStrings.length; i += 1) {
      compiler.tryCompile(expressionStrings[i]);
    }

    const startMs = performance.now();
    for (let i = 0; i < expressionStrings.length; i += 1) {
      compiler.tryCompile(expressionStrings[i]);
    }
    const cachedCompileMs = performance.now() - startMs;

    if (process.env.RSX_BENCHMARK_LOG === 'true') {
      console.log(
        `[compiled-compiler-cache] count=${expressionStrings.length} cachedCompileMs=${Number(cachedCompileMs.toFixed(2))}`,
      );
    }

    expect(cachedCompileMs).toBeGreaterThan(0);
  });
});
