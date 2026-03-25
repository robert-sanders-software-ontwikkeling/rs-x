import type { IDisposable } from '@rs-x/core';
import { type IIndexWatchRule } from '@rs-x/state-manager';

export interface IWatchRegistrationKey {
  readonly context: unknown;
  readonly index: unknown;
  readonly watchRule?: unknown;
}

export interface IExpressionEvaluateUnit extends IDisposable {
  readonly count: number;
  readonly index: unknown;
  readonly value: unknown;
  context: unknown;
  getWatchRegistrationKey?(): IWatchRegistrationKey | undefined;
  isCommitReady(): boolean;
  setValue(
    value: unknown,
    context: unknown,
    index: unknown,
    initialized: boolean,
  ): IExpressionEvaluateUnit | null;
  setContext(context: unknown, oldContext: unknown, index: unknown): void;
  commitChange(): void;
  watch(indexWatchRule?: IIndexWatchRule): unknown;
  clear(): void;
}
