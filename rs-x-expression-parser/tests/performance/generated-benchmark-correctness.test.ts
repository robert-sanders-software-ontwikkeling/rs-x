import { emptyFunction,InjectionContainer, WaitForEvent } from '@rs-x/core';

import { generatedBenchmarkExpressionStrings } from '../../lib/benchmark/generated-benchmark-expression-strings';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { rsx } from '../../lib/rsx';

import { benchmarkExpectedValues } from './generated-benchmark-expected-values.fixture';

type IModel = {
  x: number;
  y: number;
};

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

describe('Generated benchmark expressions correctness', () => {
  beforeAll(async () => {
    jest.setTimeout(120000);
    await InjectionContainer.load(RsXExpressionParserModule);
  });

  afterAll(async () => {
    await unloadRsXExpressionParserModule();
  });

  it('produces correct initial and updated values for 1000 expressions bound to one model', async () => {
    const count = Math.min(
      generatedBenchmarkExpressionStrings.length,
      readPositiveIntegerEnv('RSX_BENCHMARK_MAX_COUNT', 1000),
    );
    const expressionsToTest = generatedBenchmarkExpressionStrings.slice(
      0,
      count,
    );

    const model: IModel = { x: 7, y: 8 };
    const expressions = expressionsToTest.map((expressionString) =>
      rsx<number>(expressionString)(model),
    );

    try {
      await Promise.all(
        expressions.map((expression) =>
          expression.value !== undefined
            ? Promise.resolve()
            : new WaitForEvent(expression, 'changed').wait(emptyFunction),
        ),
      );

      for (let i = 0; i < expressions.length; i += 1) {
        expect(expressions[i].value).toBe(benchmarkExpectedValues.initial[i]);
      }

      const changedWaiters = expressions.map((expression) =>
        new WaitForEvent(expression, 'changed', {
          ignoreInitialValue: true,
        }).wait(emptyFunction),
      );

      model.x += 1;
      await Promise.all(changedWaiters);

      for (let i = 0; i < expressions.length; i += 1) {
        expect(expressions[i].value).toBe(
          benchmarkExpectedValues.afterXIncrement[i],
        );
      }

      const changedWaitersY = expressions.map((expression) =>
        new WaitForEvent(expression, 'changed', {
          ignoreInitialValue: true,
        }).wait(emptyFunction),
      );

      model.y += 1;
      await Promise.all(changedWaitersY);

      for (let i = 0; i < expressions.length; i += 1) {
        expect(expressions[i].value).toBe(
          benchmarkExpectedValues.afterYIncrement[i],
        );
      }
    } finally {
      for (let i = 0; i < expressions.length; i += 1) {
        expressions[i].dispose();
      }
    }
  });
});
