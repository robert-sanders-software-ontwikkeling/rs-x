import {
  getCurrentInstance,
  getCurrentScope,
  markRaw,
  onScopeDispose,
} from 'vue';

import { truePredicate, Type, UnsupportedException } from '@rs-x/core';
import { type IExpression, rsx } from '@rs-x/expression-parser';

export type FieldFilter = (model: object, field: string) => boolean;

export function useRsxModel<TModel extends object>(
  model: TModel,
  mustWatch?: FieldFilter,
): TModel {
  const expressionCache = new Map<object, Map<string, IExpression<unknown>>>();
  const subscriptions: Array<{ unsubscribe(): void }> = [];
  const shouldWatch = mustWatch ?? truePredicate;
  const currentInstance = getCurrentInstance();
  const forceUpdate = () => {
    currentInstance?.proxy?.$forceUpdate();
  };

  const getOrCreateExpression = (
    parent: object,
    field: string,
  ): IExpression<unknown> => {
    let fieldMap = expressionCache.get(parent);
    if (!fieldMap) {
      fieldMap = new Map();
      expressionCache.set(parent, fieldMap);
    }

    let expression = fieldMap.get(field);
    if (!expression) {
      expression = rsx(field)(parent);
      fieldMap.set(field, expression);
    }

    return expression;
  };

  const disposeExpressions = () => {
    for (const subscription of subscriptions) {
      subscription.unsubscribe();
    }

    for (const fieldMap of expressionCache.values()) {
      for (const expression of fieldMap.values()) {
        expression.dispose();
      }
    }
  };

  if (getCurrentScope()) {
    onScopeDispose(() => {
      disposeExpressions();
    });
  }

  const bindObject = (sourceObject: Record<string, unknown>) => {
    for (const [field, value] of Object.entries(sourceObject)) {
      if (
        !shouldWatch(sourceObject, field) ||
        Type.isMethod(value) ||
        Type.isArrowFunction(value)
      ) {
        continue;
      }

      if (Type.isIterableCollection(value)) {
        throw new UnsupportedException(
          'Collections are not supported by useRsxModel yet.',
        );
      }

      if (Type.isPlainObject(value)) {
        bindObject(value as Record<string, unknown>);
        continue;
      }

      const expression = getOrCreateExpression(sourceObject, field);
      subscriptions.push(
        expression.changed.subscribe(() => {
          forceUpdate();
        }),
      );
    }
  };

  bindObject(model as Record<string, unknown>);

  return markRaw(model);
}
