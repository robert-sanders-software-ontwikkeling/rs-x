import type { IDisposable } from '@rs-x/core';

export interface IWatchRegistrationKey {
  readonly context: unknown;
  readonly index: unknown;
  readonly watchRule?: unknown;
}

export interface IExpressionEvaluateChangeManager {
  isInitialized(): boolean;
  incrementChangeCycle(): void;
  decrementChangeCycle();
  markDirty(evaluateUnit: IExpressionEvaluateUnit): void;
}

export interface IExpressionEvaluateUnit extends IDisposable {
  readonly count: number;
  readonly index: unknown;
  readonly value: unknown;
  context: unknown;
  isCommitReady(): boolean;
  commitChange(): void;
  watch(changeManager: IExpressionEvaluateChangeManager): void;
}
