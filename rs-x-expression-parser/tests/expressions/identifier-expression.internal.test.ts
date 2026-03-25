import { ExpressionType } from '../../lib/expressions/expression-parser.interface';
import { IdentifierExpression } from '../../lib/expressions/identifier-expression';

describe('IdentifierExpression internals', () => {
  type IIdentifierExpressionTestDouble = {
    _services: {
      indexValueAccessor: {
        getValue: jest.Mock;
        setValue: jest.Mock;
      };
      valueMetadata: {
        isAsync: jest.Mock;
        needsProxy: jest.Mock;
      };
    };
    _context: unknown;
    _expressionEvaluateUnit: { context: unknown } | undefined;
    _parent: {
      type: ExpressionType;
      childExpressions: unknown[];
    };
    isAsync: boolean | undefined;
    setValue(value: unknown): void;
    shouldWatchIndex(targetIndex: unknown, target: unknown): boolean;
  };

  const createExpression = () => {
    const expression = new IdentifierExpression(
      'a',
    ) as unknown as IIdentifierExpressionTestDouble;
    expression._services = {
      indexValueAccessor: {
        getValue: jest.fn(),
        setValue: jest.fn(),
      },
      valueMetadata: {
        isAsync: jest.fn(),
        needsProxy: jest.fn(),
      },
    };
    return expression;
  };

  it('computes isAsync once from context value', () => {
    const expression = createExpression();
    expression._context = { ctx: true };
    expression._services.indexValueAccessor.getValue.mockReturnValue(
      Promise.resolve(1),
    );
    expression._services.valueMetadata.isAsync.mockReturnValue(true);

    expect(expression.isAsync).toBe(true);
    expect(expression.isAsync).toBe(true);
    expect(expression._services.valueMetadata.isAsync).toHaveBeenCalledTimes(1);
  });

  it('setValue prefers evaluate-unit context and falls back to expression context', () => {
    const expression = createExpression();

    expression._context = { fallback: true };
    expression._expressionEvaluateUnit = { context: { live: true } };
    expression.setValue(123);
    expect(
      expression._services.indexValueAccessor.setValue,
    ).toHaveBeenNthCalledWith(1, { live: true }, 'a', 123);

    expression._expressionEvaluateUnit = undefined;
    expression.setValue(456);
    expect(
      expression._services.indexValueAccessor.setValue,
    ).toHaveBeenNthCalledWith(2, { fallback: true }, 'a', 456);
  });

  it('falls back to parent-shape when bind-time flags are unavailable', () => {
    const expression = createExpression();
    const context = { owner: true };
    expression._expressionEvaluateUnit = { context };
    expression._services.indexValueAccessor.getValue.mockReturnValue({
      bind: () => undefined,
      dispose: () => undefined,
      changed: {},
      value: 10,
    });
    expression._services.valueMetadata.needsProxy.mockReturnValue(false);
    expression._parent = {
      type: ExpressionType.Addition,
      childExpressions: [expression, {}],
    };

    const result = expression.shouldWatchIndex('a', context);
    expect(result).toBe(true);
  });
});
