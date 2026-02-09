import { truePredicate, Type, UnsupportedException } from '@rs-x/core';

import { useRsxExpression } from './use-rsx-expression';

export type FieldFilter = (model: object, field: string) => boolean;

export function useRsxModel<
  TModel extends object,
  TRsolvedModel extends object,
>(model: TModel, mustWath?: FieldFilter): TRsolvedModel {
  const resolvedModel = {};

  const _mustWath = mustWath ?? truePredicate;
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
        : useRsxExpression(field, { model: parent });
    },
    false,
  );

  return resolvedModel as TRsolvedModel;
}
