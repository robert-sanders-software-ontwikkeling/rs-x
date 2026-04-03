import { useLayoutEffect, useMemo, useState } from 'react';

import {
  type IExpression,
} from '@rs-x/expression-parser';

function isRsxExpression<T>(value: unknown): value is IExpression<T> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<IExpression<T>> & {
    changed?: { subscribe?: unknown };
    dispose?: unknown;
    bind?: unknown;
    clone?: unknown;
  };

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.expressionString === 'string' &&
    typeof candidate.dispose === 'function' &&
    typeof candidate.bind === 'function' &&
    typeof candidate.clone === 'function' &&
    !!candidate.changed &&
    typeof candidate.changed.subscribe === 'function'
  );
}

export function useRsxExpression<T>(expression: IExpression<T>): T | null {
  const expressionTree = useMemo(() => {
    if (isRsxExpression<T>(expression)) {
      return expression;
    }
    throw new Error('useRsxExpression: expression must be an IExpression');
  }, [expression]);

  const [value, setValue] = useState<T | null>(() => {
    if (expressionTree.value !== undefined) {
      return expressionTree.value ?? null;
    }

    const evaluator = expressionTree as unknown as {
      evalateTopToBottom?: () => void;
      evaluateBottomToTop?: () => boolean;
    };

    evaluator.evalateTopToBottom?.();
    if (expressionTree.value !== undefined) {
      return expressionTree.value ?? null;
    }

    evaluator.evaluateBottomToTop?.();
    return expressionTree.value ?? null;
  });

  useLayoutEffect(() => {
    const changedSubscription = expressionTree.changed.subscribe(() => {
      setValue(expressionTree.value ?? null);
    });
    setValue(expressionTree.value ?? null);

    return () => {
      changedSubscription.unsubscribe();
    };
  }, [expressionTree]); // recreate if expression changes

  return value;
}
