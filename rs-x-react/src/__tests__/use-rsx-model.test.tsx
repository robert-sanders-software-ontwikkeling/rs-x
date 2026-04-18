import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UnsupportedException } from '@rs-x/core';
import type * as ExpressionParser from '@rs-x/expression-parser';

import { useRsxExpression } from '../hooks/use-rsx-expression';
import { useRsxModel } from '../hooks/use-rsx-model';

const { rsxMock } = vi.hoisted(() => ({
  rsxMock: vi.fn(
    (expressionString: string) => (model: Record<string, unknown>) =>
      ({
        id: `${expressionString}-id`,
        expressionString,
        value: model[expressionString],
        dispose: vi.fn(),
        bind: () => undefined,
        clone: () => undefined,
        changed: { subscribe: () => ({ unsubscribe: () => {} }) },
      }) as unknown,
  ),
}));

vi.mock('../hooks/use-rsx-expression');
vi.mock('@rs-x/expression-parser', async () => {
  const actual = await vi.importActual<ExpressionParser>(
    '@rs-x/expression-parser',
  );
  return {
    ...actual,
    rsx: rsxMock,
  };
});

describe('useRsxForm', () => {
  type IExpression = ExpressionParser.IExpression;
  beforeEach(() => {
    vi.resetAllMocks();
    rsxMock.mockClear();
  });

  it('throws UnsupportedException when model contains a collection', () => {
    const model = {
      customer: {
        age: 30,
      },
      credits: [1, 2, 3], // ❌ iterable collection
    };

    expect(() => renderHook(() => useRsxModel(model))).toThrowError(
      UnsupportedException,
    );

    expect(() => renderHook(() => useRsxModel(model))).toThrowError(
      /Collections are not supported\. They may break React's Hooks order/,
    );
  });

  it('resolves plain fields and ignores methods and arrow functions', () => {
    // Arrange
    (useRsxExpression as unknown as vi.Mock).mockImplementation(
      (expression: IExpression) => expression.value,
    );

    const model = {
      name: 'Alice',
      age: 30,
      fullName() {
        return `${this.name} Smith`; // method → should be ignored
      },
      onClick: () => {
        console.log('clicked'); // arrow fn → should be ignored
      },
    };

    // Act
    const { result } = renderHook(() => useRsxModel(model));

    // Assert
    expect(result.current).toEqual({
      name: 'Alice',
      age: 30,
    });

    expect(useRsxExpression).toHaveBeenCalledTimes(2);
    expect(useRsxExpression).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'Alice' }),
    );
    expect(useRsxExpression).toHaveBeenCalledWith(
      expect.objectContaining({ value: 30 }),
    );
  });

  it('calls useRsxExpression for all plain object fields', () => {
    const form = {
      customer: { age: 30, income: 5000 },
      credit: { score: 700, outstandingDebt: 2000 },
    };

    renderHook(() => useRsxModel(form));

    // All fields should be watched
    expect(useRsxExpression).toHaveBeenCalledWith(
      expect.objectContaining({ value: 30 }),
    );
    expect(useRsxExpression).toHaveBeenCalledWith(
      expect.objectContaining({ value: 5000 }),
    );
    expect(useRsxExpression).toHaveBeenCalledWith(
      expect.objectContaining({ value: 700 }),
    );
    expect(useRsxExpression).toHaveBeenCalledWith(
      expect.objectContaining({ value: 2000 }),
    );
  });

  it('returns resolved model with nested structure and reactive leaves', () => {
    const form = {
      customer: { age: 30, income: 5000 },
      credit: { score: 700, outstandingDebt: 2000 },
    };

    (useRsxExpression as unknown as vi.Mock).mockImplementation(
      (expression: IExpression) => expression.value,
    );

    const { result } = renderHook(() => useRsxModel(form));

    const resolved = result.current;

    const expected = {
      customer: { age: 30, income: 5000 },
      credit: { score: 700, outstandingDebt: 2000 },
    };

    expect(resolved).toEqual(expected);
  });

  it('respects mustWatch filter', () => {
    const form = { a: 1, b: 2, c: 3 };
    const mustWatch = (section: object, field: string) =>
      section === form && field !== 'b';

    renderHook(() => useRsxModel(form, mustWatch));

    expect(useRsxExpression).toHaveBeenCalledWith(
      expect.objectContaining({ value: 1 }),
    );
    expect(useRsxExpression).not.toHaveBeenCalledWith(
      expect.objectContaining({ value: 2 }),
    );
    expect(useRsxExpression).toHaveBeenCalledWith(
      expect.objectContaining({ value: 3 }),
    );
  });

  it('reuses cached expressions for the same model between renders', () => {
    (useRsxExpression as unknown as vi.Mock).mockImplementation(
      (expression: IExpression) => expression.value,
    );

    const model = { age: 30 };
    const { rerender } = renderHook(() => useRsxModel(model));

    rerender();

    expect(rsxMock).toHaveBeenCalledTimes(1);
    expect(rsxMock).toHaveBeenCalledWith('age');
  });

  it('disposes the expressions it creates when the hook unmounts', () => {
    (useRsxExpression as unknown as vi.Mock).mockImplementation(
      (expression: IExpression) => expression.value,
    );

    const model = { age: 30, score: 99 };
    const { unmount } = renderHook(() => useRsxModel(model));
    const createdExpressions = (useRsxExpression as unknown as vi.Mock).mock.calls.map(
      ([expression]: [IExpression]) => expression,
    );

    unmount();

    expect(createdExpressions).toHaveLength(2);
    for (const expression of createdExpressions) {
      expect(expression.dispose).toHaveBeenCalledTimes(1);
    }
  });
});
