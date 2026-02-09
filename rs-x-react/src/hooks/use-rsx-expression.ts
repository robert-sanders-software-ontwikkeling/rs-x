import { useEffect, useRef, useState } from 'react';

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
  const [value, setValue] = useState<T | null>(null);
  const expressionRef = useRef<IExpression<T>>();

  useEffect(() => {
    let expressionTree: IExpression;
    let ownsExpression = false;

    if (Type.isString(expression)) {
      const factory = getExpressionFactory();
      expressionTree = factory.create<T>(
        model as object,
        expression,
        leafWatchRule,
      );
      ownsExpression = true;
    } else if (expression instanceof AbstractExpression) {
      expressionTree = expression;
      ownsExpression = false;
    } else {
      throw new Error(
        'useRsxExpression: expression must be a string or an IExpression',
      );
    }

    expressionRef.current = expressionTree;

    const changedSubscription = expressionTree.changed.subscribe(() => {
      setValue(expressionTree.value);
    });
    setValue(expressionTree.value ?? null);

    return () => {
      changedSubscription.unsubscribe();
      if (ownsExpression) {
        expressionTree.dispose(); // only dispose if we created it
      }
    };
  }, [expression, model, leafWatchRule]); // recreate if expression string or model changes

  return value;
}
