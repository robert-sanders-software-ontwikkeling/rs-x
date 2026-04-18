import { type DependencyList, useLayoutEffect, useMemo, useState } from 'react';

import {
  AbstractExpression,
  CompiledExpression,
  type IExpression,
} from '@rs-x/expression-parser';

function ensureExpression<T>(expression: IExpression<T>): IExpression<T> {
  if (
    expression instanceof AbstractExpression ||
    expression instanceof CompiledExpression
  ) {
    return expression;
  }

  throw new Error('useRsxExpression: expression must be an IExpression');
}

export function useRsxExpression<T>(expression: IExpression<T>): T | null;
export function useRsxExpression<T>(
  expressionFactory: () => IExpression<T>,
  deps?: DependencyList,
): T | null;
export function useRsxExpression<T>(
  expressionOrFactory: IExpression<T> | (() => IExpression<T>),
  deps?: DependencyList,
): T | null {
  const ownsExpression = typeof expressionOrFactory === 'function';
  const expressionTree = useMemo(() => {
    if (ownsExpression) {
      return ensureExpression(
        (expressionOrFactory as () => IExpression<T>)(),
      );
    }

    return ensureExpression(expressionOrFactory as IExpression<T>);
  }, ownsExpression ? (deps ?? []) : [expressionOrFactory]);

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
      if (ownsExpression) {
        expressionTree.dispose();
      }
    };
  }, [expressionTree, ownsExpression]); // recreate if expression changes

  return value;
}
