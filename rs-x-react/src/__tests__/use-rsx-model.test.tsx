import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useRsxExpression } from '../hooks/use-rsx-expression';
import { useRsxModel } from '../hooks/use-rsx-model';

vi.mock('../hooks/use-rsx-expression');

describe('useRsxForm', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('calls useRsxExpression for all plain object fields', () => {
    const form = {
      customer: { age: 30, income: 5000 },
      credit: { score: 700, outstandingDebt: 2000 },
    };

    renderHook(() => useRsxModel(form));

    // All fields should be watched
    expect(useRsxExpression).toHaveBeenCalledWith('age', {model: form.customer});
    expect(useRsxExpression).toHaveBeenCalledWith('income', {model: form.customer});
    expect(useRsxExpression).toHaveBeenCalledWith('score', {model: form.credit});
    expect(useRsxExpression).toHaveBeenCalledWith('outstandingDebt', {model: form.credit});
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

    expect(useRsxExpression).toHaveBeenCalledWith('a', {model: form});
    expect(useRsxExpression).not.toHaveBeenCalledWith('b', {model: form});
    expect(useRsxExpression).toHaveBeenCalledWith('c', {model: form});
  });
});
