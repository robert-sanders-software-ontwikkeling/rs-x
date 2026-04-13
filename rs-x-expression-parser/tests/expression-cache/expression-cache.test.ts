import { ExpressionCache } from '../../lib/expression-cache';
import {
  clearLazyExpressionPreloaders,
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
});
