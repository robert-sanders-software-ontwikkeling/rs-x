import { getCurrentScope, onScopeDispose, shallowRef } from 'vue';

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
) {
  const { model, leafWatchRule } = options || {};
  if (Type.isString(expression) && !model) {
    throw new ArgumentException(
      'model is required when expression is a string',
    );
  }

  let expressionTree: IExpression<T>;
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
  } else {
    throw new Error(
      'useRsxExpression: expression must be a string or an IExpression',
    );
  }

  const value = shallowRef<T | null>(expressionTree.value ?? null);
  const subscription = expressionTree.changed.subscribe(() => {
    value.value = expressionTree.value ?? null;
  });

  if (getCurrentScope()) {
    onScopeDispose(() => {
      subscription.unsubscribe();
      if (ownsExpression) {
        expressionTree.dispose();
      }
    });
  }

  return value;
}
