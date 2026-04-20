import { Injectable, PreDestroy } from '@rs-x/core';

import type {
  IDirtyFlushable,
  IExpressionChangeTransactionManager,
} from './expresion-change-transaction-manager.interface';

@Injectable()
export class ExpressionChangeTransactionManager implements IExpressionChangeTransactionManager {
  private readonly _listeners = new Set<() => void>();
  private readonly _dirtyManagers = new Set<IDirtyFlushable>();
  private _suspendCount = 0;
  private _flushScheduled = false;

  @PreDestroy()
  public dispose(): void {
    this._listeners.clear();
    this._dirtyManagers.clear();
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

  public scheduleDirtyFlush(manager: IDirtyFlushable): void {
    this._dirtyManagers.add(manager);
    if (!this._flushScheduled) {
      this._flushScheduled = true;
      queueMicrotask(() => {
        this._flushScheduled = false;
        const managers = [...this._dirtyManagers];
        this._dirtyManagers.clear();
        for (let i = 0; i < managers.length; i++) {
          managers[i].flush();
        }
      });
    }
  }
}
