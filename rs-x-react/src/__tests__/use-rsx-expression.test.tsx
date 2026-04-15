import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { InjectionContainer } from '@rs-x/core';
import {
  CompiledExpression,
  ExpressionType,
  clearLazyExpressionPreloaders,
  registerCompiledExpressionPlanInExpressionCache,
  registerLazyExpressionGroupPreloader,
  rsx,
  RsXExpressionParserModule,
} from '@rs-x/expression-parser';

import type { ICompiledExpressionPlan } from '../../../rs-x-expression-parser/lib/compiled-expression/compiled-expression.compiler.interface';
import { useRsxExpression } from '../hooks/use-rsx-expression';

describe('useRsxExpression', () => {
  beforeEach(() => {
    InjectionContainer.load(RsXExpressionParserModule);
    clearLazyExpressionPreloaders();
  });

  afterEach(() => {
    clearLazyExpressionPreloaders();
    InjectionContainer.unload(RsXExpressionParserModule);
  });

  it('accepts AbstractExpression instances', () => {
    const model = { total: 42 };
    const expression = rsx<number>('total')(model);

    const { result } = renderHook(() => useRsxExpression(expression));

    expect(result.current).toBe(42);
  });

  it('returns null when an AbstractExpression starts with a null value', () => {
    const model = { total: null as number | null };
    const expression = rsx<number | null>('total')(model);

    const { result } = renderHook(() => useRsxExpression(expression));

    expect(result.current).toBeNull();
  });

  it('updates when an AbstractExpression emits a change', async () => {
    const model = { total: 42 };
    const expression = rsx<number>('total')(model);
    const { result } = renderHook(() => useRsxExpression(expression));

    act(() => {
      model.total = null as unknown as number;
    });

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it('updates from a null value to a concrete value', async () => {
    const model = { total: null as number | null };
    const expression = rsx<number | null>('total')(model);
    const { result } = renderHook(() => useRsxExpression(expression));

    act(() => {
      model.total = 7;
    });

    await waitFor(() => {
      expect(result.current).toBe(7);
    });
  });

  it('accepts CompiledExpression instances', () => {
    const plan: ICompiledExpressionPlan = {
      expressionString: 'compiled',
      dependencyNames: [],
      watchDependencies: [],
      expressionType: ExpressionType.Number,
      hasHiddenArgumentArray: false,
      evaluate: () => 5,
    };
    const expression = new CompiledExpression(plan);
    (expression as { _value: unknown })._value = 5;

    const { result } = renderHook(() => useRsxExpression(expression));

    expect(result.current).toBe(5);
  });

  it('returns null when a CompiledExpression resolves to null during evaluation', () => {
    const plan: ICompiledExpressionPlan = {
      expressionString: 'compiled-null',
      dependencyNames: [],
      watchDependencies: [],
      expressionType: ExpressionType.Number,
      hasHiddenArgumentArray: false,
      evaluate: () => undefined,
    };
    const expression = new CompiledExpression(plan) as CompiledExpression & {
      _value: unknown;
      evalateTopToBottom: () => void;
    };
    expression.evalateTopToBottom = () => {
      expression._value = null;
    };

    const { result } = renderHook(() => useRsxExpression(expression));

    expect(result.current).toBeNull();
  });

  it('does not throw when useRsxExpression evaluates a pending lazy compiled expression before its plan resolves', async () => {
    const expressionString = 'a + b';
    const plan: ICompiledExpressionPlan = {
      expressionString,
      dependencyNames: ['a', 'b'],
      watchDependencies: [
        {
          name: 'a',
          ownerPath: [],
          isLeaf: true,
          isMemberExpressionSegment: false,
        },
        {
          name: 'b',
          ownerPath: [],
          isLeaf: true,
          isMemberExpressionSegment: false,
        },
      ],
      expressionType: ExpressionType.Binary,
      hasHiddenArgumentArray: false,
      evaluate: (a: number, b: number) => a + b,
    };

    let resolveLoader: (() => void) | undefined;
    registerLazyExpressionGroupPreloader('page1', async () => {
      await new Promise<void>((resolve) => {
        resolveLoader = resolve;
      });
      registerCompiledExpressionPlanInExpressionCache(expressionString, plan);
    });

    const model = { a: 3, b: 2 };
    const expression = rsx<number>(expressionString, {
      lazyGroup: 'page1',
      compiled: true,
    })(model);

    const { result } = renderHook(() => useRsxExpression(expression));

    expect(result.current).toBeNull();

    await act(async () => {
      resolveLoader?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current).toBe(5);
    });
  });

  it('throws for values that are not RS-X expressions', () => {
    expect(() => renderHook(() => useRsxExpression({} as never))).toThrowError(
      'useRsxExpression: expression must be an IExpression',
    );
  });
});
