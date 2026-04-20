import { performance } from 'node:perf_hooks';

import { InjectionContainer } from '@rs-x/core';
import {
  type IStateManager,
  RsXStateManagerInjectionTokens,
} from '@rs-x/state-manager';

import type { IExpression } from '../../lib/expressions/expression-parser.interface';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { rsx } from '../../lib/rsx';

type IModel = Record<string, number>;

type IRunResult = {
  expressionCount: number;
  watchStateCalls: number;
  newSubscriptions: number;
  totalMs: number;
  msPerExpression: number;
};

function createModel(variableCount: number): IModel {
  const model: IModel = {};
  for (let i = 0; i < variableCount; i += 1) {
    model[`v${i}`] = i + 1;
  }
  return model;
}

function createExpressions(
  expressionCount: number,
  variableCount: number,
): string[] {
  const base = Array.from({ length: variableCount }, (_, i) => `v${i}`).join(
    ' + ',
  );
  return Array.from(
    { length: expressionCount },
    (_, i) => `(${base}) + ${i} - ${i}`,
  );
}

describe('shared watch scaling', () => {
  beforeAll(async () => {
    jest.setTimeout(180000);
    await InjectionContainer.load(RsXExpressionParserModule);
  });

  afterAll(async () => {
    await unloadRsXExpressionParserModule();
  });

  it('stays shared for 1000/3000/5000/10000 expressions and avoids quadratic watch registrations', () => {
    const variableCount = 10;
    const sizes = [1000, 3000, 5000, 10000];
    const stateManager = InjectionContainer.get(
      RsXStateManagerInjectionTokens.IStateManager,
    ) as IStateManager;
    const results: IRunResult[] = [];

    for (let s = 0; s < sizes.length; s += 1) {
      const expressionCount = sizes[s];
      const model = createModel(variableCount);
      const expressionStrings = createExpressions(
        expressionCount,
        variableCount,
      );
      const created: IExpression[] = [];
      let watchStateCalls = 0;
      let newSubscriptions = 0;
      const originalWatchState = stateManager.watchState.bind(stateManager);

      stateManager.watchState = (
        context: unknown,
        index: unknown,
        options?: Parameters<IStateManager['watchState']>[2],
      ): unknown => {
        watchStateCalls += 1;
        if (!stateManager.isWatched(context, index, options?.indexWatchRule)) {
          newSubscriptions += 1;
        }
        return originalWatchState(context, index, options);
      };

      const startMs = performance.now();
      try {
        for (let i = 0; i < expressionStrings.length; i += 1) {
          created.push(rsx<number>(expressionStrings[i])(model));
        }
      } finally {
        stateManager.watchState = originalWatchState;
      }

      const totalMs = performance.now() - startMs;
      results.push({
        expressionCount,
        watchStateCalls,
        newSubscriptions,
        totalMs,
        msPerExpression: totalMs / expressionCount,
      });

      for (let i = 0; i < created.length; i += 1) {
        created[i].dispose();
      }
    }

    for (let i = 0; i < results.length; i += 1) {
      expect(results[i].watchStateCalls).toBe(variableCount);
      expect(results[i].newSubscriptions).toBe(variableCount);
    }

    // Quadratic growth would make per-expression cost increase sharply.
    // Keep this threshold loose to avoid CI flakiness while still catching blowups.
    const firstPerExpr = results[0].msPerExpression;
    const lastPerExpr = results[results.length - 1].msPerExpression;
    expect(lastPerExpr / firstPerExpr).toBeLessThan(5);

    if (process.env.RSX_BENCHMARK_LOG === 'true') {
      console.table(
        results.map((result) => ({
          expressionCount: result.expressionCount,
          watchStateCalls: result.watchStateCalls,
          newSubscriptions: result.newSubscriptions,
          totalMs: Number(result.totalMs.toFixed(2)),
          msPerExpression: Number(result.msPerExpression.toFixed(5)),
        })),
      );
    }
  });
});
