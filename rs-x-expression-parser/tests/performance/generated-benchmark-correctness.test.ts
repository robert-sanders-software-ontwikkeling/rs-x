import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
import {
  type IStateManager,
  RsXStateManagerInjectionTokens,
} from '@rs-x/state-manager';

import { generatedBenchmarkExpressionStrings } from '../../lib/benchmark/generated-benchmark-expression-strings';
import { AbstractExpression } from '../../lib/expressions/abstract-expression';
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

type ISharedModel = Record<string, number>;

function createSharedModel(variableCount: number): ISharedModel {
  const model: ISharedModel = {};
  for (let i = 0; i < variableCount; i += 1) {
    model[`v${i}`] = i + 1;
  }
  return model;
}

function createSharedExpressions(
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

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

async function waitUntilInitialized(
  expressions: Array<ReturnType<ReturnType<typeof rsx<number>>>>,
): Promise<void> {
  await Promise.all(
    expressions.map((expression) =>
      expression.value !== undefined
        ? Promise.resolve()
        : new WaitForEvent(expression, 'changed').wait(emptyFunction),
    ),
  );
}

function withRootTopDownCounter(): {
  readonly getCount: () => number;
  readonly restore: () => void;
} {
  const prototype = AbstractExpression.prototype as AbstractExpression;
  const originalEvalateTopToBottom = prototype['evalateTopToBottom'];
  let rootTopDownCalls = 0;

  prototype['evalateTopToBottom'] = function patchedEvalateTopToBottom(): void {
    if (!this.parent) {
      rootTopDownCalls += 1;
    }
    originalEvalateTopToBottom.call(this);
  };

  return {
    getCount: () => rootTopDownCalls,
    restore: () => {
      prototype['evalateTopToBottom'] = originalEvalateTopToBottom;
    },
  };
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

  it('evaluates top-to-bottom once per expression tree during initialization', async () => {
    const count = Math.min(
      generatedBenchmarkExpressionStrings.length,
      readPositiveIntegerEnv('RSX_BENCHMARK_MAX_COUNT', 1000),
    );
    const expressionsToTest = generatedBenchmarkExpressionStrings.slice(
      0,
      count,
    );
    const model: IModel = { x: 7, y: 8 };

    const counter = withRootTopDownCounter();

    const expressions = expressionsToTest.map((expressionString) =>
      rsx<number>(expressionString)(model),
    );

    try {
      await waitUntilInitialized(expressions);

      expect(counter.getCount()).toBe(count);
    } finally {
      counter.restore();
      for (let i = 0; i < expressions.length; i += 1) {
        expressions[i].dispose();
      }
    }
  });

  it('evaluates once per tree when binding N unique expressions to the same model', async () => {
    const count = Math.min(
      generatedBenchmarkExpressionStrings.length,
      readPositiveIntegerEnv('RSX_BENCHMARK_MAX_COUNT', 1000),
    );
    const model: IModel = { x: 7, y: 8 };
    const counter = withRootTopDownCounter();
    const expressions = generatedBenchmarkExpressionStrings
      .slice(0, count)
      .map((expressionString) => rsx<number>(expressionString)(model));

    const expected = benchmarkExpectedValues.initial.slice(
      0,
      expressions.length,
    );

    try {
      await waitUntilInitialized(expressions);
      expect(counter.getCount()).toBe(count);
      for (let i = 0; i < expressions.length; i += 1) {
        expect(expressions[i].value).toBe(expected[i]);
      }
    } finally {
      counter.restore();
      for (let i = 0; i < expressions.length; i += 1) {
        expressions[i].dispose();
      }
    }
  });

  it('evaluates once per tree when binding N expressions to different models', async () => {
    const count = readPositiveIntegerEnv('RSX_BENCHMARK_MAX_COUNT', 1000);
    const models: IModel[] = Array.from({ length: count }, (_, i) => ({
      x: i,
      y: i * 2,
    }));
    const counter = withRootTopDownCounter();
    const expressions = models.map((model) => rsx<number>('x + y')(model));

    try {
      await waitUntilInitialized(expressions);
      expect(counter.getCount()).toBe(count);
      for (let i = 0; i < expressions.length; i += 1) {
        expect(expressions[i].value).toBe(i + i * 2);
      }
    } finally {
      counter.restore();
      for (let i = 0; i < expressions.length; i += 1) {
        expressions[i].dispose();
      }
    }
  });

  it('calls stateManager.watchState only 10 times for 1000 expressions sharing 10 identifiers', async () => {
    const variableCount = 10;
    const expressionCount = 1000;
    const stateManager = InjectionContainer.get(
      RsXStateManagerInjectionTokens.IStateManager,
    ) as IStateManager;

    const model = createSharedModel(variableCount);
    const expressionStrings = createSharedExpressions(
      expressionCount,
      variableCount,
    );
    let expressions: Array<ReturnType<ReturnType<typeof rsx<number>>>> = [];

    let watchStateCalls = 0;
    const originalWatchState = stateManager.watchState.bind(stateManager);

    stateManager.watchState = (
      context: unknown,
      index: unknown,
      options?: Parameters<IStateManager['watchState']>[2],
    ): unknown => {
      watchStateCalls += 1;
      return originalWatchState(context, index, options);
    };

    try {
      expressions = expressionStrings.map((expressionString) =>
        rsx<number>(expressionString)(model),
      );
      await waitUntilInitialized(expressions);
      expect(watchStateCalls).toBe(variableCount);
    } finally {
      stateManager.watchState = originalWatchState;
      for (let i = 0; i < expressions.length; i += 1) {
        expressions[i].dispose();
      }
    }
  });
});
