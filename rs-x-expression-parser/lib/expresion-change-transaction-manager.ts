import { Injectable, PreDestroy } from '@rs-x/core';

import type { IExpressionChangeTransactionManager } from './expresion-change-transaction-manager.interface';

@Injectable()
export class ExpressionChangeTransactionManager implements IExpressionChangeTransactionManager {
  private readonly _listeners = new Set<() => void>();
  private _suspendCount = 0;

  @PreDestroy()
  public dispose(): void {
    this._listeners.clear();
  }

  public suspend(): void {
    this._suspendCount++;
  }

  public continue(): void {
    this._suspendCount--;

    this.commit();
  }

  public subscribeCommitted(listener: () => void): () => void {
    this._listeners.add(listener);

    return () => {
      this._listeners.delete(listener);
    };
  }

  public commit(): void {
    if (this._suspendCount > 0 || this._listeners.size === 0) {
      return;
    }

    const listeners = [...this._listeners];
    this._listeners.clear();

    for (const listener of listeners) {
      listener();
    }
  }
}
