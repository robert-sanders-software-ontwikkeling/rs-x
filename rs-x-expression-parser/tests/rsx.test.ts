import { InjectionContainer } from '@rs-x/core';

import { AbstractExpression } from '../lib/expressions/abstract-expression';
import {
  clearLazyExpressionPreloaders,
  registerLazyExpressionGroupPreloader,
} from '../lib/expression-cache/lazy-expression-preload-registry';
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
