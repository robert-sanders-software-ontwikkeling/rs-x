import { useEffect, useRef } from 'react';

import { truePredicate, Type, UnsupportedException } from '@rs-x/core';
import { type IExpression, rsx } from '@rs-x/expression-parser';

import { useRsxExpression } from './use-rsx-expression';

export type FieldFilter = (model: object, field: string) => boolean;

export function useRsxModel<
  TModel extends object,
  TRsolvedModel extends object,
>(model: TModel, mustWath?: FieldFilter): TRsolvedModel {
  const resolvedModel = {};
  const expressionCacheRef = useRef(
    new WeakMap<object, Map<string, IExpression<unknown>>>(),
  );

  const _mustWath = mustWath ?? truePredicate;

  useEffect(() => {
    return () => {
      expressionCacheRef.current = new WeakMap();
    };
  }, [model]);

  const getOrCreateExpression = (
    parent: object,
    field: string,
  ): IExpression<unknown> => {
    const cache = expressionCacheRef.current;
    let fieldMap = cache.get(parent);
    if (!fieldMap) {
      fieldMap = new Map();
      cache.set(parent, fieldMap);
    }

    let expression = fieldMap.get(field);
    if (!expression) {
      expression = rsx(field)(parent);
      fieldMap.set(field, expression);
    }

    return expression;
  };

  Type.walkObjectTopToBottom(
    model,
    (parent, field, value) => {
      if (
        !_mustWath(parent, field) ||
        Type.isMethod(value) ||
        Type.isArrowFunction(value)
      ) {
        return;
      }

      if (Type.isIterableCollection(value)) {
        throw new UnsupportedException(
          `Collections are not supported. They may break React's Hooks order`,
        );
      }

      resolvedModel[field] = Type.isPlainObject(value)
        ? useRsxModel(value as object, mustWath)
        : useRsxExpression(getOrCreateExpression(parent, field));
    },
    false,
  );

  return resolvedModel as TRsolvedModel;
}
