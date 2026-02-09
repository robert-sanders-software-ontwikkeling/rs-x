import { truePredicate, Type } from '@rs-x/core';

import { useRsxExpression } from './use-rsx-expression';

export type FieldFilter = (model: object, field: string) => boolean;

export function useRsxModel<T extends object>(
  model: T,
  mustWath?: FieldFilter,
): T {
  const resolvedModel = {};

  const _mustWath = mustWath ?? truePredicate;
  Type.walkObjectTopToBottom(
    model,
    (parent, field, value) => {
      if (!_mustWath(parent, field)) {
        return;
      }

      resolvedModel[field] = Type.isPlainObject(value)
        ? useRsxModel(value as object, mustWath)
        : useRsxExpression(field, { model: parent });
    },
    false,
  );

  return resolvedModel as T;
}
