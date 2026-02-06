import { useEffect, useRef, useState } from 'react';

import { ArgumentException, Type } from '@rs-x/core';
import { AbstractExpression, type IExpression } from '@rs-x/expression-parser';

import { getExpressionFactory } from '../expressionFactory';

export function useRsxExpression<T>(
  expression: string | IExpression<T>,
  model?: object,
): T | undefined {
  if (Type.isString(expression) && !model) {
    throw new ArgumentException(
      'model is required when expression is a string',
    );
  }
  const [value, setValue] = useState<T | undefined>();
  const expressionRef = useRef<IExpression<T>>();

  useEffect(() => {
    // Create expression and capture ownership
    let expressionTree: IExpression;
    let ownsExpression = false;

    if (Type.isString(expression)) {
      const factory = getExpressionFactory();
      expressionTree = factory.create<T>(model as object, expression);
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

    // Subscribe to changes
    const changedSubscription = expressionTree.changed.subscribe(() =>
      setValue(expressionTree.value),
    );
    setValue(expressionTree.value ?? null); // initialize

    return () => {
      changedSubscription.unsubscribe();
      if (ownsExpression) {
        expressionTree.dispose(); // only dispose if we created it
      }
    };
  }, [expression, model]); // recreate if expression string or model changes

  return value;
}
