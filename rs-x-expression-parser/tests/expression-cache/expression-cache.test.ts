import { ExpressionCache } from '../../lib/expression-cache';
import {
  clearLazyExpressionPreloaders,
  registerLazyExpressionGroupPreloader,
  registerLazyExpressionPreloader,
} from '../../lib/expression-cache/lazy-expression-preload-registry';
import type { IExpressionEngineSelector } from '../../lib/expression-engine/expression-engine.interface';
import { ExpressionType } from '../../lib/expressions';
import { ExpressionMock } from '../../lib/testing';

describe('ExpressionCache', () => {
  afterEach(() => {
    clearLazyExpressionPreloaders();
  });

  it('registerExpressionTree prevents parser usage for precompiled expression', () => {
    const parsedExpression = new ExpressionMock({
      expressionString: 'a + b',
      type: ExpressionType.Addition,
    });
    const parsedClone = new ExpressionMock({
      expressionString: 'a + b',
      type: ExpressionType.Addition,
    });
    (parsedExpression as unknown as { clone: jest.Mock }).clone = jest.fn(
      () => parsedClone,
    );

    const expressionEngineSelector = {
      create: jest.fn(() => parsedExpression),
      getMode: jest.fn(() => 'compiled'),
    } as unknown as IExpressionEngineSelector;

    const cache = new ExpressionCache(expressionEngineSelector);

    const precompiledExpression = new ExpressionMock({
      expressionString: 'a + b',
      type: ExpressionType.Addition,
    });
    const precompiledClone = new ExpressionMock({
      expressionString: 'a + b',
      type: ExpressionType.Addition,
    });
    (precompiledExpression as unknown as { clone: jest.Mock }).clone = jest.fn(
      () => precompiledClone,
    );

    cache.registerExpressionTree('a + b', precompiledExpression);
    const result = cache.create({ expressionString: 'a + b' });

    expect(expressionEngineSelector.create).not.toHaveBeenCalled();
    expect(precompiledExpression.clone).toHaveBeenCalledTimes(1);
    expect(result.instance).toBe(precompiledClone);
  });

  it('uses parser for non-precompiled expression and reuses cached template', () => {
    const parsedExpression = new ExpressionMock({
      expressionString: 'a * b',
      type: ExpressionType.Multiplication,
    });
    const cloneA = new ExpressionMock({
      expressionString: 'a * b',
      type: ExpressionType.Multiplication,
    });
    (parsedExpression as unknown as { clone: jest.Mock }).clone = jest.fn(
      () => cloneA,
    );

    const expressionEngineSelector = {
      create: jest.fn(() => parsedExpression),
      getMode: jest.fn(() => 'compiled'),
    } as unknown as IExpressionEngineSelector;
    const cache = new ExpressionCache(expressionEngineSelector);

    const first = cache.create({ expressionString: 'a * b' });
    const second = cache.create({ expressionString: 'a * b' });

    expect(expressionEngineSelector.create).toHaveBeenCalledTimes(1);
    expect(parsedExpression.clone).toHaveBeenCalledTimes(1);
    expect(first.instance).toBe(parsedExpression);
    expect(second.instance).toBe(cloneA);
  });

  it('triggers lazy preloader synchronously on first cache miss and can satisfy request without parser', () => {
    const parsedExpression = new ExpressionMock({
      expressionString: 'a - b',
      type: ExpressionType.Subtraction,
    });
    const expressionEngineSelector = {
      create: jest.fn(() => parsedExpression),
      getMode: jest.fn(() => 'compiled'),
    } as unknown as IExpressionEngineSelector;
    const cache = new ExpressionCache(expressionEngineSelector);

    const precompiledExpression = new ExpressionMock({
      expressionString: 'a - b',
      type: ExpressionType.Subtraction,
    });
    const precompiledClone = new ExpressionMock({
      expressionString: 'a - b',
      type: ExpressionType.Subtraction,
    });
    (precompiledExpression as unknown as { clone: jest.Mock }).clone = jest.fn(
      () => precompiledClone,
    );

    let loaderCalls = 0;
    registerLazyExpressionPreloader('a - b', () => {
      loaderCalls += 1;
      cache.registerExpressionTree('a - b', precompiledExpression);
    });

    const first = cache.create({ expressionString: 'a - b' });
    const second = cache.create({ expressionString: 'a - b' });

    expect(loaderCalls).toBe(1);
    expect(expressionEngineSelector.create).not.toHaveBeenCalled();
    expect(first.instance).toBe(precompiledClone);
    expect(second.instance).toBe(precompiledClone);
  });

  it('does not parse when an async lazy-preloaded compiled expression is pending', async () => {
    const parsedExpression = new ExpressionMock({
      expressionString: 'a / b',
      type: ExpressionType.Division,
    });
    const parsedClone = new ExpressionMock({
      expressionString: 'a / b',
      type: ExpressionType.Division,
    });
    (parsedExpression as unknown as { clone: jest.Mock }).clone = jest.fn(
      () => parsedClone,
    );

    const expressionEngineSelector = {
      create: jest.fn(() => parsedExpression),
      getMode: jest.fn(() => 'compiled'),
    } as unknown as IExpressionEngineSelector;
    const cache = new ExpressionCache(expressionEngineSelector);

    const precompiledExpression = new ExpressionMock({
      expressionString: 'a / b',
      type: ExpressionType.Division,
    });
    const precompiledClone = new ExpressionMock({
      expressionString: 'a / b',
      type: ExpressionType.Division,
    });
    (precompiledExpression as unknown as { clone: jest.Mock }).clone = jest.fn(
      () => precompiledClone,
    );

    registerLazyExpressionPreloader('a / b', async () => {
      await Promise.resolve();
      cache.registerExpressionTree('a / b', precompiledExpression);
    });

    const first = cache.create({ expressionString: 'a / b', lazy: true });
    await Promise.resolve();
    await Promise.resolve();
    const second = cache.create({ expressionString: 'a / b', lazy: true });

    expect(expressionEngineSelector.create).not.toHaveBeenCalled();
    expect(first.instance.expressionString).toBe('a / b');
    expect(second.instance.expressionString).toBe('a / b');
  });

  it('starts lazy group preload on first use even when expression falls through to the runtime engine', async () => {
    const parsedExpression = new ExpressionMock({
      expressionString: 'a + b',
      type: ExpressionType.Addition,
    });
    const expressionEngineSelector = {
      create: jest.fn(() => parsedExpression),
      getMode: jest.fn(() => 'tree'),
    } as unknown as IExpressionEngineSelector;
    const cache = new ExpressionCache(expressionEngineSelector);

    let loaderCalls = 0;
    registerLazyExpressionGroupPreloader('Page1', async () => {
      loaderCalls += 1;
      await Promise.resolve();
    });

    const result = cache.create({
      expressionString: 'a + b',
      lazyGroup: 'Page1',
      compiled: false,
    });
    await Promise.resolve();

    expect(loaderCalls).toBe(1);
    expect(expressionEngineSelector.create).toHaveBeenCalledTimes(1);
    expect(result.instance).toBe(parsedExpression);
  });

  it('starts a lazy group preload only once when different expressions in the same group are used during an in-flight load', async () => {
    const parsedExpressionA = new ExpressionMock({
      expressionString: 'a + b',
      type: ExpressionType.Addition,
    });
    const parsedExpressionB = new ExpressionMock({
      expressionString: 'x * y',
      type: ExpressionType.Multiplication,
    });
    const expressionEngineSelector = {
      create: jest.fn((expressionString: string) => {
        if (expressionString === 'a + b') {
          return parsedExpressionA;
        }
        if (expressionString === 'x * y') {
          return parsedExpressionB;
        }
        throw new Error(`Unexpected expression: ${expressionString}`);
      }),
      getMode: jest.fn(() => 'tree'),
    } as unknown as IExpressionEngineSelector;
    const cache = new ExpressionCache(expressionEngineSelector);

    let resolveLoad!: () => void;
    const loadStarted = new Promise<void>((resolve) => {
      resolveLoad = resolve;
    });
    let loaderCalls = 0;
    registerLazyExpressionGroupPreloader('shared-page', async () => {
      loaderCalls += 1;
      await loadStarted;
    });

    const first = cache.create({
      expressionString: 'a + b',
      lazyGroup: 'shared-page',
      compiled: false,
    });
    const second = cache.create({
      expressionString: 'x * y',
      lazyGroup: 'shared-page',
      compiled: false,
    });
    await Promise.resolve();

    expect(loaderCalls).toBe(1);
    expect(expressionEngineSelector.create).toHaveBeenCalledTimes(2);
    expect(first.instance).toBe(parsedExpressionA);
    expect(second.instance).toBe(parsedExpressionB);

    resolveLoad();
    await loadStarted;
    expect(loaderCalls).toBe(1);
  });
});
