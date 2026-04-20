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

describe('watchState shared-variable analysis', () => {
  beforeAll(async () => {
    await InjectionContainer.load(RsXExpressionParserModule);
  });

  afterAll(async () => {
    await unloadRsXExpressionParserModule();
  });

  it('shows total watch calls vs new subscriptions for 1000 expressions sharing 10 vars', () => {
    const variableCount = 10;
    const expressionCount = 1000;
    const stateManager = InjectionContainer.get(
      RsXStateManagerInjectionTokens.IStateManager,
    ) as IStateManager;

    const model = createModel(variableCount);
    const expressions = createExpressions(expressionCount, variableCount);
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

    try {
      for (let i = 0; i < expressions.length; i += 1) {
        created.push(rsx<number>(expressions[i])(model));
      }

      // Diagnostic baseline:
      // - watchStateCalls counts every registration attempt from evaluate units
      // - newSubscriptions counts first-time subscriptions (context/index/rule)
      // This highlights fan-out overhead when many trees share the same model.
      if (process.env.RSX_BENCHMARK_LOG === 'true') {
        console.log(
          `[shared-vars] watchStateCalls=${watchStateCalls} newSubscriptions=${newSubscriptions}`,
        );
      }
      expect(watchStateCalls).toBe(variableCount);
      expect(newSubscriptions).toBe(variableCount);
    } finally {
      stateManager.watchState = originalWatchState;
      for (let i = 0; i < created.length; i += 1) {
        created[i].dispose();
      }
    }
  });
});
