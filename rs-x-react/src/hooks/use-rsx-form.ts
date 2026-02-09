import { truePredicate, Type } from '@rs-x/core';

import { useRsxExpression } from './use-rsx-expression';

export type FormFieldFilter = (formSection: object, field: string) => boolean;

export function useRsxForm<T extends Record<string, unknown>>(
  form: T,
  mustWath?: FormFieldFilter,
): void {
  const _mustWath = mustWath ?? truePredicate;
  Type.walkObjectTopToBottom(
    form,
    (formSection, field) => {
      if (_mustWath(formSection, field)) {
        useRsxExpression(field, { model: formSection });
      }
    },
    true,
  );
}
