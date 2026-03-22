import type { IDisposable } from '@rs-x/core';

import type { ValueChange } from './value-change.enum';

export interface IExpressionEvaluateUnit extends IDisposable {
  readonly index: unknown;
  context: unknown;
  setValue(value: unknown, context: unknown, index: unknown): ValueChange;
  commit(): void;
  readonly value: unknown;
}
