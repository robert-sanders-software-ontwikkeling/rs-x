import { ExpressionCache } from '../../lib/expression-cache';
import type { IExpressionEngineSelector } from '../../lib/expression-engine/expression-engine.interface';
import { ExpressionType } from '../../lib/expressions';
import { ExpressionMock } from '../../lib/testing';

describe('ExpressionCache', () => {
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
    const result = cache.create('a + b');

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

    const first = cache.create('a * b');
    const second = cache.create('a * b');

    expect(expressionEngineSelector.create).toHaveBeenCalledTimes(1);
    expect(parsedExpression.clone).toHaveBeenCalledTimes(1);
    expect(first.instance).toBe(parsedExpression);
    expect(second.instance).toBe(cloneA);
  });
});
