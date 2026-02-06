import { useEffect, useRef, useState } from 'react';

import { ArgumentException, Type } from '@rs-x/core';
import { AbstractExpression, type IExpression } from '@rs-x/expression-parser';

import { getExpressionFactory } from '../expressionFactory';

export function useRsxExpression<T>(
  expression: string | AbstractExpression,
  model?: object,
): T | undefined {
  if (Type.isString(expression) && !model) {
    throw new ArgumentException(
      'model is required when expression is a string',
    );
  }
  const [value, setValue] = useState<T | undefined>();
  const expressionRef = useRef<AbstractExpression<T>>();

  useEffect(() => {
    // Dispose previous expression if we owned it
    if (
      expressionRef.current?.dispose &&
      expressionRef.current instanceof AbstractExpression
    ) {
      // previous expression cleanup handled below
    }

    // Create expression and capture ownership
    let expr: IExpression;
    let ownsExpression = false;

    if (Type.isString(expression)) {
      const factory = getExpressionFactory();
      expr = factory.create<T>(model as object, expression);
      ownsExpression = true;
    } else if (expression instanceof AbstractExpression) {
      expr = expression;
      ownsExpression = false;
    } else {
      throw new Error(
        'useRsxExpression: expression must be a string or an IExpression',
      );
    }

    expressionRef.current = expr;

    // Subscribe to changes
    const sub = expr.changed.subscribe(() => setValue(expr.value));
    setValue(expr.value); // initialize

    return () => {
      sub.unsubscribe();
      if (ownsExpression) {
        expr.dispose(); // only dispose if we created it
      }
    };
  }, [expression, model]); // recreate if expression string or model changes

  return value;
}
