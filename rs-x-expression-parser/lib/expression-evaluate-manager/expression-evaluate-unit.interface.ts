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
  /** Called before commitChange() in a batch flush to increment ancestor pending counts. */
  prepareForBatchEvaluate?(): void;
  /**
   * Called instead of watch() when this unit shares a (context, index) pair with a
   * primary unit in the same expression manager. Reads the initial value without
   * registering watch listeners — the manager fans out changes via applyChange().
   */
  watchAsReplica?(changeManager: IExpressionEvaluateChangeManager): void;
  /**
   * Pushes a new value onto this replica unit so it can commit without a watch callback.
   * Called by the manager immediately after the primary unit's markDirty fires.
   */
  applyChange?(newValue: unknown): void;
}
