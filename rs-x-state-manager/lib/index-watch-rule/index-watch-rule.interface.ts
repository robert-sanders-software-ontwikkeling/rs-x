import { type IDisposable } from '@rs-x/core';

export type ShouldWatchIndexPredicate = (
  context: unknown,
  index: unknown,
  target: unknown,
) => boolean;

export interface IIndexWatchRule extends IDisposable {
  id: unknown;
  context: unknown;
  test(index: unknown, target: unknown): boolean;
}
