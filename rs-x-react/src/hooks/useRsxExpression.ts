import { useEffect, useRef, useState } from 'react';

import { type IExpression } from '@rs-x/expression-parser';

import { getExpressionFactory } from '../expressionFactory';

export function useRsxExpression<T>(
  expressionString: string,
  model: object,
): T | undefined {
  const [value, setValue] = useState<T | undefined>();
  const expressionRef = useRef<IExpression<T>>();

  // Initialize expression once
  if (!expressionRef.current) {
    const factory = getExpressionFactory();
    expressionRef.current = factory.create<T>(model, expressionString);
  }

  useEffect(() => {
    const expression = expressionRef.current!;
    const changeSubscription = expression.changed.subscribe(() =>
      setValue(expression.value),
    );
    setValue(expression.value); // initialize
    return () => {
      changeSubscription.unsubscribe();
      expression.dispose();
    };
  }, []);

  return value;
}
