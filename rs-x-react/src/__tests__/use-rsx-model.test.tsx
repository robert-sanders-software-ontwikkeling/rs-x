import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UnsupportedException } from '@rs-x/core';

import { useRsxExpression } from '../hooks/use-rsx-expression';
import { useRsxModel } from '../hooks/use-rsx-model';

vi.mock('../hooks/use-rsx-expression');

describe('useRsxForm', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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
      (field: string, { model }: { model: object }) => model[field],
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
    expect(useRsxExpression).toHaveBeenCalledWith('name', { model });
    expect(useRsxExpression).toHaveBeenCalledWith('age', { model });
  });

  it('calls useRsxExpression for all plain object fields', () => {
    const form = {
      customer: { age: 30, income: 5000 },
      credit: { score: 700, outstandingDebt: 2000 },
    };

    renderHook(() => useRsxModel(form));

    // All fields should be watched
    expect(useRsxExpression).toHaveBeenCalledWith('age', {
      model: form.customer,
    });
    expect(useRsxExpression).toHaveBeenCalledWith('income', {
      model: form.customer,
    });
    expect(useRsxExpression).toHaveBeenCalledWith('score', {
      model: form.credit,
    });
    expect(useRsxExpression).toHaveBeenCalledWith('outstandingDebt', {
      model: form.credit,
    });
  });

  it('returns resolved model with nested structure and reactive leaves', () => {
    const form = {
      customer: { age: 30, income: 5000 },
      credit: { score: 700, outstandingDebt: 2000 },
    };

    (useRsxExpression as unknown as vi.Mock).mockImplementation(
      (field: string, { model }: { model: Record<string, unknown> }) =>
        model[field],
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

    expect(useRsxExpression).toHaveBeenCalledWith('a', { model: form });
    expect(useRsxExpression).not.toHaveBeenCalledWith('b', { model: form });
    expect(useRsxExpression).toHaveBeenCalledWith('c', { model: form });
  });
});
