import type { IDisposableOwner } from '@rs-x/core';

import type { IIndexWatchRule } from './index-watch-rule.interface';

export class IndexWatchRule implements IIndexWatchRule {
  private _isDisposed = false;

  constructor(
    public context: unknown,
    private readonly predicate: (
      index: unknown,
      target: unknown,
      context: unknown,
    ) => boolean,
    private _owner: IDisposableOwner,
  ) {}

  public dispose(): void {
    if (this._isDisposed) {
      return;
    }

    if (this._owner.canDispose?.()) {
      this._isDisposed = true;
    }

    this._owner.release();
  }

  public test(index: unknown, target: unknown): boolean {
    return this.predicate(index, target, this.context);
  }
}
