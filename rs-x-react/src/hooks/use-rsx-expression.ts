import { useLayoutEffect, useMemo, useState } from 'react';

import { AbstractExpression, type IExpression } from '@rs-x/expression-parser';

export function useRsxExpression<T>(expression: IExpression<T>): T | null {
  const expressionTree = useMemo(() => {
    if (expression instanceof AbstractExpression) {
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
