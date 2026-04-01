import { performance } from 'node:perf_hooks';

import { InjectionContainer } from '@rs-x/core';
import {
  type IWatchFactory,
  RsXStateManagerInjectionTokens,
} from '@rs-x/state-manager';

import {
  IdentifierExpressionEvaluateUnit,
  type IExpressionEvaluateManager,
} from '../../lib/expression-evaluate-manager';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('ExpressionEvaluateManager profile', () => {
  type IProfileModel = {
    shared: number;
  };

  let watchFactory: IWatchFactory;
  let evaluateManager: IExpressionEvaluateManager;

  beforeAll(async () => {
    await InjectionContainer.load(RsXExpressionParserModule);
    watchFactory = InjectionContainer.get<IWatchFactory>(
      RsXStateManagerInjectionTokens.IWatchFactory,
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
          watchFactory,
          undefined,
          () => {
            totalCommits++;
          },
          evaluate,
        );

        evaluateManager.createAndGetInstance(evaluate).register(unit);
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
