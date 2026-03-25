import { performance } from 'node:perf_hooks';

import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';

import { generatedBenchmarkExpressionStrings } from '../../lib/benchmark/generated-benchmark-expression-strings';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { rsx } from '../../lib/rsx';

const DEFAULT_MAX_COUNT = 500;

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function readPositiveNumberEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

type IRound = {
  count: number;
  batchSize: number;
  createMs: number;
  initMs: number;
  totalMs: number;
  perExpressionMs: number;
  cumulativePerExpressionMs: number;
};

describe('Generated benchmark expressions initialization', () => {
  beforeAll(async () => {
    jest.setTimeout(120000);
    await InjectionContainer.load(RsXExpressionParserModule);
  });

  afterAll(async () => {
    await unloadRsXExpressionParserModule();
  });

  it('initializes incrementally with near-linear scaling and full set under 1s', async () => {
    const step = readPositiveIntegerEnv('RSX_BENCHMARK_STEP', 10);
    const linearityTolerance = readPositiveNumberEnv(
      'RSX_BENCHMARK_LINEARITY_TOLERANCE',
      4.0,
    );
    const targetFullInitMs = readPositiveNumberEnv(
      'RSX_BENCHMARK_TARGET_MS',
      1000,
    );
    const rounds: IRound[] = [];
    const model = { x: 7, y: 8 };
    const benchmarkExpressionFactories =
      generatedBenchmarkExpressionStrings.map((expression) => {
        const createExpression = rsx(expression);
        return () => createExpression(model);
      });

    const totalFactories = Math.min(
      generatedBenchmarkExpressionStrings.length,
      readPositiveIntegerEnv('RSX_BENCHMARK_MAX_COUNT', DEFAULT_MAX_COUNT),
    );
    const expressions: Array<
      ReturnType<(typeof benchmarkExpressionFactories)[number]>
    > = [];
    let currentCount = 0;
    let cumulativeTotalMs = 0;

    let previousCumulativePerExpressionMs: number | undefined;
    while (currentCount < totalFactories) {
      const nextCount = Math.min(currentCount + step, totalFactories);
      const batchSize = nextCount - currentCount;

      const createStart = performance.now();
      const newExpressions = benchmarkExpressionFactories
        .slice(currentCount, nextCount)
        .map((createExpression) => createExpression());
      const createMs = performance.now() - createStart;
      expressions.push(...newExpressions);

      const initStart = performance.now();
      await Promise.all(
        newExpressions.map((expression) =>
          expression.value !== undefined
            ? Promise.resolve()
            : new WaitForEvent(expression, 'changed').wait(emptyFunction),
        ),
      );
      const initMs = performance.now() - initStart;

      const allNewResolved = newExpressions.every(
        (expression) => expression.value !== undefined,
      );
      expect(allNewResolved).toBe(true);

      const totalMs = createMs + initMs;
      cumulativeTotalMs += totalMs;
      const perExpressionMs = totalMs / batchSize;
      const cumulativePerExpressionMs = cumulativeTotalMs / nextCount;
      rounds.push({
        count: nextCount,
        batchSize,
        createMs,
        initMs,
        totalMs,
        perExpressionMs,
        cumulativePerExpressionMs,
      });

      // Use cumulative cost-per-expression instead of per-batch cost to avoid
      // false failures from occasional GC pauses while still catching
      // non-linear growth.
      if (previousCumulativePerExpressionMs !== undefined) {
        const ratio =
          cumulativePerExpressionMs / previousCumulativePerExpressionMs;
        expect(ratio).toBeLessThanOrEqual(linearityTolerance);
      }
      previousCumulativePerExpressionMs = cumulativePerExpressionMs;
      currentCount = nextCount;
    }

    const allResolved = expressions.every(
      (expression) => expression.value !== undefined,
    );
    expect(allResolved).toBe(true);
    for (let i = 0; i < expressions.length; i += 1) {
      expressions[i].dispose();
    }

    const finalRound = rounds[rounds.length - 1];
    expect(finalRound).toBeDefined();
    if (process.env.RSX_BENCHMARK_LOG === 'true') {
      console.table(
        rounds.map((round) => ({
          count: round.count,
          batchSize: round.batchSize,
          createMs: Number(round.createMs.toFixed(2)),
          initMs: Number(round.initMs.toFixed(2)),
          totalMs: Number(round.totalMs.toFixed(2)),
          perExpressionMs: Number(round.perExpressionMs.toFixed(4)),
          cumulativePerExpressionMs: Number(
            round.cumulativePerExpressionMs.toFixed(4),
          ),
        })),
      );
      console.log(
        `[benchmark] totalCount=${totalFactories} cumulativeTotalMs=${Number(cumulativeTotalMs.toFixed(2))}`,
      );
    }
    expect(cumulativeTotalMs).toBeLessThanOrEqual(targetFullInitMs);
  });
});
