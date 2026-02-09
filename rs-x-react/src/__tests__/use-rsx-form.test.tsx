import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useRsxExpression } from '../hooks/use-rsx-expression';
import { useRsxForm } from '../hooks/use-rsx-form';

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

    renderHook(() => useRsxForm(form));

    // All fields should be watched
    expect(useRsxExpression).toHaveBeenCalledWith('age', form.customer);
    expect(useRsxExpression).toHaveBeenCalledWith('income', form.customer);
    expect(useRsxExpression).toHaveBeenCalledWith('score', form.credit);
    expect(useRsxExpression).toHaveBeenCalledWith(
      'outstandingDebt',
      form.credit,
    );
  });

  it('respects mustWatch filter', () => {
    const form = { a: 1, b: 2, c: 3 };
    const mustWatch = (section: object, field: string) =>
      section === form && field !== 'b';

    renderHook(() => useRsxForm(form, mustWatch));

    expect(useRsxExpression).toHaveBeenCalledWith('a', form);
    expect(useRsxExpression).not.toHaveBeenCalledWith('b', form);
    expect(useRsxExpression).toHaveBeenCalledWith('c', form);
  });
});
