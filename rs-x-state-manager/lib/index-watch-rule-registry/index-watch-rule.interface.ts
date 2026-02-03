import type { IDisposable } from '@rs-x/core';

export interface IIndexWatchRule extends IDisposable {
  context: unknown;
  test(index: unknown, target: unknown): boolean;
}
