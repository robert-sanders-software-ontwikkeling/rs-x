import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useRsxExpression } from '../hooks/use-rsx-expression';

type MockExpression<T> = {
  id: string;
  expressionString: string;
  dispose: () => void;
  bind: () => unknown;
  clone: () => unknown;
  changed: {
    subscribe: (callback: () => void) => { unsubscribe: () => void };
  };
  value: T | undefined;
  evalateTopToBottom?: () => void;
  evaluateBottomToTop?: () => boolean;
};

function createExpression<T>(value: T | undefined): MockExpression<T> {
  let subscriber: (() => void) | undefined;
  return {
    id: 'expr-1',
    expressionString: 'value',
    dispose: vi.fn(),
    bind: vi.fn(),
    clone: vi.fn(),
    changed: {
      subscribe: vi.fn((callback: () => void) => {
        subscriber = callback;
        return { unsubscribe: vi.fn() };
      }),
    },
    value,
    triggerChanged: () => subscriber?.(),
  };
}

describe('useRsxExpression', () => {
  it('returns the current value for a valid expression object', () => {
    const expression = createExpression<number>(42);

    const { result } = renderHook(() =>
      useRsxExpression(expression as never),
    );

    expect(result.current).toBe(42);
  });

  it('returns null when the expression value is null', () => {
    const expression = createExpression<null>(null);

    const { result } = renderHook(() =>
      useRsxExpression(expression as never),
    );

    expect(result.current).toBeNull();
  });

  it('evaluates top-to-bottom when the initial value is undefined', () => {
    const expression = createExpression<number>(undefined);
    expression.evalateTopToBottom = vi.fn(() => {
      expression.value = 12;
    });

    const { result } = renderHook(() =>
      useRsxExpression(expression as never),
    );

    expect(expression.evalateTopToBottom).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(12);
  });

  it('falls back to bottom-to-top evaluation when needed', () => {
    const expression = createExpression<number>(undefined);
    expression.evalateTopToBottom = vi.fn();
    expression.evaluateBottomToTop = vi.fn(() => {
      expression.value = 24;
      return true;
    });

    const { result } = renderHook(() =>
      useRsxExpression(expression as never),
    );

    expect(expression.evalateTopToBottom).toHaveBeenCalledTimes(1);
    expect(expression.evaluateBottomToTop).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(24);
  });

  it('updates to null when the subscribed expression emits a nullish value', () => {
    const expression = createExpression<number | null>(1) as MockExpression<
      number | null
    > & { triggerChanged: () => void };

    const { result } = renderHook(() =>
      useRsxExpression(expression as never),
    );

    expression.value = null;
    act(() => {
      expression.triggerChanged();
    });

    expect(result.current).toBeNull();
  });

  it('returns null when top-to-bottom evaluation resolves to null', () => {
    const expression = createExpression<number | null>(undefined);
    expression.evalateTopToBottom = vi.fn(() => {
      expression.value = null;
    });

    const { result } = renderHook(() =>
      useRsxExpression(expression as never),
    );

    expect(result.current).toBeNull();
  });

  it('throws for an invalid expression object', () => {
    expect(() =>
      renderHook(() => useRsxExpression(null as never)),
    ).toThrowError('useRsxExpression: expression must be an IExpression');
  });
});
