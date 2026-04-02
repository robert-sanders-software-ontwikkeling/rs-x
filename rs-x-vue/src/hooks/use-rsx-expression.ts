import { getCurrentScope, onScopeDispose, shallowRef } from 'vue';

import { AbstractExpression, type IExpression } from '@rs-x/expression-parser';

export function useRsxExpression<T>(expression: IExpression<T>) {
  if (!(expression instanceof AbstractExpression)) {
    throw new Error('useRsxExpression: expression must be an IExpression');
  }

  const expressionTree = expression;
  const value = shallowRef<T | null>(expressionTree.value ?? null);
  const subscription = expressionTree.changed.subscribe(() => {
    value.value = expressionTree.value ?? null;
  });

  if (getCurrentScope()) {
    onScopeDispose(() => {
      subscription.unsubscribe();
    });
  }

  return value;
}
