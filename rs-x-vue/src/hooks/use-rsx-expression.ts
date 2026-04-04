import { getCurrentScope, onScopeDispose, shallowRef } from 'vue';

import {
  AbstractExpression,
  CompiledExpression,
  type IExpression,
} from '@rs-x/expression-parser';

export function useRsxExpression<T>(expression: IExpression<T>) {
  if (
    !(expression instanceof AbstractExpression) &&
    !(expression instanceof CompiledExpression)
  ) {
    throw new Error('useRsxExpression: expression must be an IExpression');
  }

  const expressionTree = expression as AbstractExpression | CompiledExpression;
  const getCurrentValue = (): T | null => {
    return (expressionTree.value as T | null | undefined) ?? null;
  };

  const value = shallowRef<T | null>(getCurrentValue());
  const subscription = expressionTree.changed.subscribe(() => {
    value.value = getCurrentValue();
  });

  if (getCurrentScope()) {
    onScopeDispose(() => {
      subscription.unsubscribe();
    });
  }

  return value;
}
