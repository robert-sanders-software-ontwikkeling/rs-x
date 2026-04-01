import { performance } from 'node:perf_hooks';

import { generatedBenchmarkExpressionStrings } from '../../lib/benchmark/generated-benchmark-expression-strings';
import { CompiledExpressionCompiler } from '../../lib/compiled-expression/compiled-expression.compiler';
import type { ICompiledExpressionCompiler } from '../../lib/compiled-expression/compiled-expression.compiler.interface';
import { JsExpressionAstParser } from '../../lib/js-expression-ast-parser';

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function loadGeneratedExpressionStrings(maxCount: number): string[] {
  return generatedBenchmarkExpressionStrings.slice(0, maxCount);
}

function loadIdentifierExpressions(maxCount: number): string[] {
  const identifiers = new Array(maxCount);
  for (let i = 0; i < maxCount; i += 1) {
    identifiers[i] = `id${i}`;
  }
  return identifiers;
}

function readIterations(): number {
  return readPositiveIntegerEnv('RSX_BENCHMARK_ITERATIONS', 5);
}

function summarizeTimes(times: number[]): {
  min: number;
  max: number;
  mean: number;
  median: number;
} {
  const sorted = [...times].sort((a, b) => a - b);
  const min = sorted[0] ?? 0;
  const max = sorted[sorted.length - 1] ?? 0;
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  const mean = sorted.length > 0 ? sum / sorted.length : 0;
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle] ?? 0;
  return { min, max, mean, median };
}

function createCompiler(): ICompiledExpressionCompiler {
  return new CompiledExpressionCompiler(new JsExpressionAstParser());
}

describe('CompiledExpressionCompiler benchmark', () => {
  it('profiles compile cost for complex expressions', () => {
    const maxCount = readPositiveIntegerEnv('RSX_BENCHMARK_MAX_COUNT', 1000);
    const iterations = readIterations();
    const expressionStrings = loadGeneratedExpressionStrings(maxCount);
    expect(expressionStrings.length).toBeGreaterThan(0);
    expect(iterations).toBeGreaterThan(0);

    const times: number[] = [];
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      const compiler = createCompiler();
      const startMs = performance.now();
      for (let i = 0; i < expressionStrings.length; i += 1) {
        compiler.tryCompile(expressionStrings[i]);
      }
      times.push(performance.now() - startMs);
    }
    const stats = summarizeTimes(times);

    if (process.env.RSX_BENCHMARK_LOG === 'true') {
      console.log(
        `[compiled-compiler-complex] count=${expressionStrings.length} iterations=${iterations} minMs=${Number(stats.min.toFixed(2))} medianMs=${Number(stats.median.toFixed(2))} meanMs=${Number(stats.mean.toFixed(2))} maxMs=${Number(stats.max.toFixed(2))}`,
      );
    }

    expect(stats.max).toBeGreaterThan(0);
  });

  it('profiles cache hit cost for repeated complex compilation', () => {
    const maxCount = readPositiveIntegerEnv('RSX_BENCHMARK_MAX_COUNT', 1000);
    const iterations = readIterations();
    const expressionStrings = loadGeneratedExpressionStrings(maxCount);
    expect(expressionStrings.length).toBeGreaterThan(0);
    expect(iterations).toBeGreaterThan(0);

    const times: number[] = [];
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      const compiler = createCompiler();
      for (let i = 0; i < expressionStrings.length; i += 1) {
        compiler.tryCompile(expressionStrings[i]);
      }
      const startMs = performance.now();
      for (let i = 0; i < expressionStrings.length; i += 1) {
        compiler.tryCompile(expressionStrings[i]);
      }
      times.push(performance.now() - startMs);
    }
    const stats = summarizeTimes(times);

    if (process.env.RSX_BENCHMARK_LOG === 'true') {
      console.log(
        `[compiled-compiler-complex-cache] count=${expressionStrings.length} iterations=${iterations} minMs=${Number(stats.min.toFixed(2))} medianMs=${Number(stats.median.toFixed(2))} meanMs=${Number(stats.mean.toFixed(2))} maxMs=${Number(stats.max.toFixed(2))}`,
      );
    }

    expect(stats.max).toBeGreaterThan(0);
  });

  it('profiles compile cost for identifier-only expressions', () => {
    const maxCount = readPositiveIntegerEnv(
      'RSX_BENCHMARK_IDENT_COUNT',
      1000,
    );
    const iterations = readIterations();
    const expressionStrings = loadIdentifierExpressions(maxCount);
    expect(expressionStrings.length).toBeGreaterThan(0);
    expect(iterations).toBeGreaterThan(0);

    const times: number[] = [];
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      const compiler = createCompiler();
      const startMs = performance.now();
      for (let i = 0; i < expressionStrings.length; i += 1) {
        compiler.tryCompile(expressionStrings[i]);
      }
      times.push(performance.now() - startMs);
    }
    const stats = summarizeTimes(times);

    if (process.env.RSX_BENCHMARK_LOG === 'true') {
      console.log(
        `[compiled-compiler-ident] count=${expressionStrings.length} iterations=${iterations} minMs=${Number(stats.min.toFixed(2))} medianMs=${Number(stats.median.toFixed(2))} meanMs=${Number(stats.mean.toFixed(2))} maxMs=${Number(stats.max.toFixed(2))}`,
      );
    }

    expect(stats.max).toBeGreaterThan(0);
  });

  it('profiles cache hit cost for repeated identifier compilation', () => {
    const maxCount = readPositiveIntegerEnv(
      'RSX_BENCHMARK_IDENT_COUNT',
      1000,
    );
    const iterations = readIterations();
    const expressionStrings = loadIdentifierExpressions(maxCount);
    expect(expressionStrings.length).toBeGreaterThan(0);
    expect(iterations).toBeGreaterThan(0);

    const times: number[] = [];
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      const compiler = createCompiler();
      for (let i = 0; i < expressionStrings.length; i += 1) {
        compiler.tryCompile(expressionStrings[i]);
      }
      const startMs = performance.now();
      for (let i = 0; i < expressionStrings.length; i += 1) {
        compiler.tryCompile(expressionStrings[i]);
      }
      times.push(performance.now() - startMs);
    }
    const stats = summarizeTimes(times);

    if (process.env.RSX_BENCHMARK_LOG === 'true') {
      console.log(
        `[compiled-compiler-ident-cache] count=${expressionStrings.length} iterations=${iterations} minMs=${Number(stats.min.toFixed(2))} medianMs=${Number(stats.median.toFixed(2))} meanMs=${Number(stats.mean.toFixed(2))} maxMs=${Number(stats.max.toFixed(2))}`,
      );
    }

    expect(stats.max).toBeGreaterThan(0);
  });
});
