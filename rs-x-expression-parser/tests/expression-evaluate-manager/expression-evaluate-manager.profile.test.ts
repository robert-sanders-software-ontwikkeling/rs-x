import { performance } from 'node:perf_hooks';

import { InjectionContainer } from '@rs-x/core';
import {
  type IStateManager,
  RsXStateManagerInjectionTokens,
} from '@rs-x/state-manager';

import { RsXExpressionParserInjectionTokens } from '../../lib';
import {
  IdentifierExpressionEvaluateUnit,
  type IExpressionEvaluateManager,
} from '../../lib/expression-evaluate-manager';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('ExpressionEvaluateManager profile', () => {
  type IProfileModel = {
    shared: number;
  };

  let stateManager: IStateManager;
  let evaluateManager: IExpressionEvaluateManager;

  beforeAll(async () => {
    await InjectionContainer.load(RsXExpressionParserModule);
    stateManager = InjectionContainer.get<IStateManager>(
      RsXStateManagerInjectionTokens.IStateManager,
    );
    evaluateManager = InjectionContainer.get<IExpressionEvaluateManager>(
      RsXExpressionParserInjectionTokens.IExpressionEvaluateManager,
    );
  });

  afterAll(async () => {
    await unloadRsXExpressionParserModule();
  });

  it('profiles batched state-change handling without expression tree usage', async () => {
    const identifierCount = 50;

    const unitCount = 1000;
    const burstCount = 1000;
    const repeatedIdentifier: keyof IProfileModel = 'shared';
    const model: IProfileModel = { shared: 1 };
    let totalCommits = 0;

    let start = performance.now();

    for (let i = 0; i < unitCount; i++) {
      const evaluate = () => {};
      // Register multiple occurrences of the same identifier on one model.
      for (let j = 0; j < identifierCount; j++) {
        const unit = new IdentifierExpressionEvaluateUnit(
          repeatedIdentifier,
          model,
          stateManager,
          () => {
            totalCommits++;
          },
          evaluate,
        );

        evaluateManager.create(evaluate).instance.register(unit);
      }
    }

    await flushMicrotasks();

    let durationMs = performance.now() - start;
    console.info(
      `[ExpressionEvaluateManager profile]  intialize units=${unitCount}, durationMs=${durationMs.toFixed(
        2,
      )}, totalCommits=${totalCommits}`,
    );

    start = performance.now();

    for (let i = 0; i < burstCount; i++) {
      model.shared = i + 2;

      if (i % 10 === 9) {
        await flushMicrotasks();
      }
    }

    await flushMicrotasks();

    durationMs = performance.now() - start;

    console.info(
      `[ExpressionEvaluateManager profile] bursts=${burstCount}, durationMs=${durationMs.toFixed(
        2,
      )}`,
    );
  });
});
