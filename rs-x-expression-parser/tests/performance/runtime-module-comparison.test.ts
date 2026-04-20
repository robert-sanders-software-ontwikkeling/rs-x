import { performance } from 'node:perf_hooks';

import { generatedBenchmarkExpressionStrings } from '../../lib/benchmark/generated-benchmark-expression-strings';

type IMeasurement = {
  readonly loadMs: number;
  readonly createMs: number;
  readonly initMs: number;
  readonly totalMs: number;
};

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

async function measureModuleInitialization(
  kind: 'runtime' | 'parser',
  expressionStrings: readonly string[],
): Promise<IMeasurement> {
  jest.resetModules();

  const { performance: runtimePerformance } = await import('node:perf_hooks');
  const { InjectionContainer, WaitForEvent, emptyFunction } =
    await import('@rs-x/core');
  const {
    clearLazyExpressionPreloaders,
    clearPreparsedExpressionAsts,
    registerPreparsedExpressionAst,
  } = await import('../../lib/expression-cache');
  const { JsExpressionAstParser } =
    await import('../../lib/js-expression-ast-parser');
  const { RsXExpressionParserInjectionTokens } =
    await import('../../lib/rs-x-expression-parser-injection-tokes');

  const astParser = new JsExpressionAstParser();
  clearPreparsedExpressionAsts();
  clearLazyExpressionPreloaders();
  for (let i = 0; i < expressionStrings.length; i += 1) {
    const expressionString = expressionStrings[i];
    registerPreparsedExpressionAst(
      expressionString,
      astParser.parse(expressionString),
    );
  }

  const moduleStartMs = runtimePerformance.now();
  const moduleExports: any =
    kind === 'runtime'
      ? await import('../../lib/rs-x-expression-runtime.module')
      : await import('../../lib/rs-x-expression-parser.module');

  const moduleToLoad =
    kind === 'runtime'
      ? moduleExports.RsXExpressionRuntimeModule
      : moduleExports.RsXExpressionParserModule;
  const unloadModule =
    kind === 'runtime'
      ? moduleExports.unloadRsXExpressionRuntimeModule
      : moduleExports.unloadRsXExpressionParserModule;

  await InjectionContainer.load(moduleToLoad);
  const loadMs = runtimePerformance.now() - moduleStartMs;

  try {
    const expressionFactory = InjectionContainer.get<any>(
      RsXExpressionParserInjectionTokens.IExpressionFactory,
    );

    const model = { x: 7, y: 8 };
    const createStartMs = runtimePerformance.now();
    const expressions = expressionStrings.map((expressionString) =>
      expressionFactory.create(model, expressionString),
    );
    const createMs = runtimePerformance.now() - createStartMs;

    const initStartMs = runtimePerformance.now();
    await Promise.all(
      expressions.map((expression) =>
        expression.value !== undefined
          ? Promise.resolve()
          : new WaitForEvent(expression, 'changed').wait(emptyFunction),
      ),
    );
    const initMs = runtimePerformance.now() - initStartMs;

    for (let i = 0; i < expressions.length; i += 1) {
      expressions[i].dispose();
    }

    return {
      loadMs,
      createMs,
      initMs,
      totalMs: loadMs + createMs + initMs,
    };
  } finally {
    clearPreparsedExpressionAsts();
    clearLazyExpressionPreloaders();
    await unloadModule();
  }
}

describe('Runtime module comparison benchmark', () => {
  it('keeps the lightweight runtime startup cheaper than the full parser module for AOT-style expressions', async () => {
    jest.setTimeout(120000);

    const count = Math.min(
      generatedBenchmarkExpressionStrings.length,
      readPositiveIntegerEnv('RSX_BENCHMARK_MAX_COUNT', 50),
    );
    const rounds = readPositiveIntegerEnv('RSX_BENCHMARK_ROUNDS', 5);
    const expressions = generatedBenchmarkExpressionStrings.slice(0, count);

    expect(expressions.length).toBeGreaterThan(0);

    await measureModuleInitialization('runtime', expressions);
    await measureModuleInitialization('parser', expressions);

    const runtimeTotals: number[] = [];
    const parserTotals: number[] = [];
    const runtimeLoads: number[] = [];
    const parserLoads: number[] = [];

    for (let i = 0; i < rounds; i += 1) {
      const runtimeMeasurement = await measureModuleInitialization(
        'runtime',
        expressions,
      );
      const parserMeasurement = await measureModuleInitialization(
        'parser',
        expressions,
      );

      runtimeTotals.push(runtimeMeasurement.totalMs);
      parserTotals.push(parserMeasurement.totalMs);
      runtimeLoads.push(runtimeMeasurement.loadMs);
      parserLoads.push(parserMeasurement.loadMs);
    }

    const runtimeMedianTotalMs = median(runtimeTotals);
    const parserMedianTotalMs = median(parserTotals);
    const runtimeMedianLoadMs = median(runtimeLoads);
    const parserMedianLoadMs = median(parserLoads);

    if (process.env.RSX_BENCHMARK_LOG === 'true') {
      console.log(
        `[runtime-vs-parser] count=${count} rounds=${rounds} runtimeMedianLoadMs=${Number(
          runtimeMedianLoadMs.toFixed(2),
        )} parserMedianLoadMs=${Number(
          parserMedianLoadMs.toFixed(2),
        )} runtimeMedianTotalMs=${Number(
          runtimeMedianTotalMs.toFixed(2),
        )} parserMedianTotalMs=${Number(parserMedianTotalMs.toFixed(2))}`,
      );
    }

    expect(runtimeMedianLoadMs).toBeLessThanOrEqual(parserMedianLoadMs * 1.05);
    expect(runtimeMedianTotalMs).toBeLessThanOrEqual(
      parserMedianTotalMs * 1.05,
    );
  });
});
