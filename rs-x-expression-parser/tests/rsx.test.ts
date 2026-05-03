import { InjectionContainer } from '@rs-x/core';

import { AbstractExpression } from '../lib/expressions/abstract-expression';
import {
  clearLazyExpressionPreloaders,
  registerLazyExpressionGroupPreloader,
} from '../lib/expression-cache/lazy-expression-preload-registry';
import {
  applyRsxDebugChangeHook,
  getRsxDebugChangeHook,
  setRsxDebugChangeHook,
} from '../lib/expression-debug-hook';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../lib/rs-x-expression-parser.module';
import { rsx } from '../lib/rsx';

describe('rsx (integration)', () => {
  beforeAll(async () => {
    await InjectionContainer.load(RsXExpressionParserModule);
  });

  afterAll(async () => {
    await unloadRsXExpressionParserModule();
  });

  afterEach(() => {
    clearLazyExpressionPreloaders();
  });

  it('creates an expression and evaluates correctly', () => {
    const model = { a: 1, b: 2 };

    const expression = rsx<number>('a+b')(model);
    expect(expression).toBeInstanceOf(AbstractExpression);
  });

  it('wraps debug change hooks while preserving user-assigned hooks', async () => {
    const debugHook = jest.fn();
    const userHook = jest.fn();
    const debugHookRegistration = setRsxDebugChangeHook(debugHook);
    const expression = applyRsxDebugChangeHook(
      rsx<number>('a+b')({ a: 1, b: 2 }),
      {
        expressionName: 'sumRsx',
        source: {
          fileName: '/workspace/sum.expressions.rsx',
          start: 0,
          end: 3,
        },
      },
    );
    const firstChange = new Promise<void>((resolve) => {
      const subscription = expression.changed.subscribe(() => {
        subscription.unsubscribe();
        resolve();
      });
    });

    await firstChange;
    expression.changeHook = userHook;

    expect(debugHook).toHaveBeenCalledWith(
      expect.objectContaining({ expressionName: 'sumRsx' }),
      expression,
      undefined,
    );
    expect(userHook).toHaveBeenCalledWith(expression, undefined);

    debugHookRegistration.dispose();
    expression.dispose();
  });

  it('allows users to define the injected debug hook globally', async () => {
    const debugHook = jest.fn();
    globalThis.__RSX_DEBUG_CHANGE_HOOK__ = debugHook;
    const expression = applyRsxDebugChangeHook(
      rsx<number>('a+b')({ a: 1, b: 2 }),
      {
        expressionName: 'sumRsx',
      },
    );
    const firstChange = new Promise<void>((resolve) => {
      const subscription = expression.changed.subscribe(() => {
        subscription.unsubscribe();
        resolve();
      });
    });

    await firstChange;

    expect(getRsxDebugChangeHook()).toBe(debugHook);
    expect(debugHook).toHaveBeenCalledWith(
      expect.objectContaining({ expressionName: 'sumRsx' }),
      expression,
      undefined,
    );

    delete globalThis.__RSX_DEBUG_CHANGE_HOOK__;
    expression.dispose();
  });

  it('starts one shared lazyGroup load on first use in tree mode', async () => {
    let resolveLoad!: () => void;
    const loadStarted = new Promise<void>((resolve) => {
      resolveLoad = resolve;
    });
    let loaderCalls = 0;

    registerLazyExpressionGroupPreloader('Page1', async () => {
      loaderCalls += 1;
      await loadStarted;
    });

    const first = rsx<number>('a + b', {
      lazyGroup: 'Page1',
      compiled: false,
    })({ a: 1, b: 2 });
    const second = rsx<number>('x * y', {
      lazyGroup: 'Page1',
      compiled: false,
    })({ x: 3, y: 4 });

    expect(first).toBeInstanceOf(AbstractExpression);
    expect(second).toBeInstanceOf(AbstractExpression);

    await Promise.resolve();
    expect(loaderCalls).toBe(1);

    resolveLoad();
    await loadStarted;
    expect(loaderCalls).toBe(1);

    first.dispose();
    second.dispose();
  });
});
