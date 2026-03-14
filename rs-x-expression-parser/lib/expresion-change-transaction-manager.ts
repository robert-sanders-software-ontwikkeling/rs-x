import { Observable, Subject, Subscription } from 'rxjs';

import { Inject, Injectable, PreDestroy } from '@rs-x/core';
import {
  type IStateManager,
  RsXStateManagerInjectionTokens,
} from '@rs-x/state-manager';

import type {
  IExpressionChangeCommitHandler,
  IExpressionChangeTransactionManager,
} from './expresion-change-transaction-manager.interface';
import { AbstractExpression } from './expressions';

@Injectable()
export class ExpressionChangeTransactionManager implements IExpressionChangeTransactionManager {
  private readonly _commited = new Subject<AbstractExpression>();
  private readonly _changes = new Map<
    AbstractExpression,
    Set<IExpressionChangeCommitHandler>
  >();
  private readonly _listenersByRoot = new Map<
    AbstractExpression,
    Set<(expression: AbstractExpression) => void>
  >();
  private readonly _startChangeCycleSubscription: Subscription;
  private readonly _endChangeCycleSubscription: Subscription;
  private _emittedChangeCounter = 0;
  private _suspended = false;

  constructor(
    @Inject(RsXStateManagerInjectionTokens.IStateManager)
    stateManager: IStateManager,
  ) {
    this._startChangeCycleSubscription =
      stateManager.startChangeCycle.subscribe(this.onStartChangeCycle);
    this._endChangeCycleSubscription = stateManager.endChangeCycle.subscribe(
      this.onEndChangeCycle,
    );
  }

  public get commited(): Observable<AbstractExpression> {
    return this._commited;
  }

  @PreDestroy()
  public dispose(): void {
    this._startChangeCycleSubscription.unsubscribe();
    this._endChangeCycleSubscription.unsubscribe();
    this._listenersByRoot.clear();
  }

  public suspend(): void {
    this._suspended = true;
  }

  public continue(): void {
    this._suspended = false;
    this.commit();
  }

  public subscribeCommitted(
    rootExpression: AbstractExpression,
    listener: (expression: AbstractExpression) => void,
  ): () => void {
    let listeners = this._listenersByRoot.get(rootExpression);
    if (!listeners) {
      listeners = new Set();
      this._listenersByRoot.set(rootExpression, listeners);
    }
    listeners.add(listener);

    return () => {
      const existing = this._listenersByRoot.get(rootExpression);
      if (!existing) {
        return;
      }

      existing.delete(listener);
      if (existing.size === 0) {
        this._listenersByRoot.delete(rootExpression);
      }
    };
  }

  public commit(): void {
    this._emittedChangeCounter = 0;

    for (const root of this._changes.keys()) {
      this.tryCommit(root, false);
    }
    this._changes.clear();
  }

  private tryCommit(root: AbstractExpression, previousCommited: boolean): void {
    const commitHandlers = this._changes.get(root);

    if (!commitHandlers?.size) {
      if (previousCommited) {
        this.emitCommitted(root);
      }

      return;
    }

    let comitted = false;
    for (const commitHandler of commitHandlers) {
      comitted = commitHandler.commit(root, commitHandlers) || comitted;
    }

    queueMicrotask(() => this.tryCommit(root, comitted));
  }
  public registerChange(
    rootExpression: AbstractExpression,
    commitHandler: IExpressionChangeCommitHandler,
  ): void {
    let commitHandlers = this._changes.get(rootExpression);
    if (!commitHandlers) {
      commitHandlers = new Set();
      this._changes.set(rootExpression, commitHandlers);
    }
    commitHandlers.add(commitHandler);
  }

  private onStartChangeCycle = () => {
    this._emittedChangeCounter++;
  };

  private onEndChangeCycle = () => {
    if (this._emittedChangeCounter === 0) {
      return;
    }

    this._emittedChangeCounter--;
    if (this._emittedChangeCounter !== 0 || this._suspended) {
      return;
    }

    this.commit();
  };

  private emitCommitted(root: AbstractExpression): void {
    this._commited.next(root);

    // Notify listeners for the committed root and its parent chain.
    // This preserves behavior for calculated-path roots (for example
    // IndexExpression roots inside MemberExpression), without global fan-out.
    let current: AbstractExpression | undefined = root;
    while (current) {
      const listeners = this._listenersByRoot.get(current);
      if (listeners && listeners.size > 0) {
        Array.from(listeners).forEach((listener) => listener(root));
      }

      current = current.parent;
    }
  }
}
