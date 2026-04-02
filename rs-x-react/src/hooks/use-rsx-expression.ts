import { useLayoutEffect, useMemo, useState } from 'react';

import { ArgumentException, Type } from '@rs-x/core';
import { AbstractExpression, type IExpression } from '@rs-x/expression-parser';
import { type IIndexWatchRule } from '@rs-x/state-manager';

import { getExpressionFactory } from '../expression.factory';

export interface IUseRsxExpressionOptions {
  model?: object;
  leafWatchRule?: IIndexWatchRule;
}

export function useRsxExpression<T>(
  expression: string | IExpression<T>,
  options?: IUseRsxExpressionOptions,
): T | null {
  const { model, leafWatchRule } = options || {};
  if (Type.isString(expression) && !model) {
    throw new ArgumentException(
      'model is required when expression is a string',
    );
  }
  const { expressionTree, ownsExpression } = useMemo(() => {
    if (Type.isString(expression)) {
      const factory = getExpressionFactory();
      return {
        expressionTree: factory.create<T>(
          model as object,
          expression,
          leafWatchRule,
        ),
        ownsExpression: true,
      };
    }
    if (expression instanceof AbstractExpression) {
      return { expressionTree: expression, ownsExpression: false };
    }
    throw new Error(
      'useRsxExpression: expression must be a string or an IExpression',
    );
  }, [expression, model, leafWatchRule]);

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
        expressionTree.dispose(); // only dispose if we created it
      }
    };
  }, [expressionTree, ownsExpression]); // recreate if expression string or model changes

  return value;
}
