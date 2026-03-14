import { type Observable, ReplaySubject, type Subscription } from 'rxjs';

import { Type } from '@rs-x/core';
import {
  type IContextChanged,
  type IIndexWatchRule,
  IndexWatchRule,
  type IStateChange,
  type IStateManager,
} from '@rs-x/state-manager';

import { type IExpressionChangeCommitHandler } from '../expresion-change-transaction-manager.interface';

import { AbstractExpression } from './abstract-expression';
import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';
import { ExpressionType } from './expression-parser.interface';

interface IStateManagerEventSubscriber {
  context: unknown;
  index: unknown;
  onStateChange: (change: IStateChange) => void;
  onContextChanged: (change: IContextChanged) => void;
}

class StateManagerEventRouter {
  private static readonly _routers = new WeakMap<
    IStateManager,
    StateManagerEventRouter
  >();

  public static get(stateManager: IStateManager): StateManagerEventRouter {
    let router = this._routers.get(stateManager);
    if (!router) {
      router = new StateManagerEventRouter(stateManager);
      this._routers.set(stateManager, router);
    }

    return router;
  }

  private readonly _changeSubscription: Subscription;
  private readonly _contextChangeSubscription: Subscription;
  private readonly _subscribersByContext = new Map<
    unknown,
    Map<unknown, Set<IStateManagerEventSubscriber>>
  >();

  private constructor(private readonly _stateManager: IStateManager) {
    this._changeSubscription = this._stateManager.changed.subscribe(
      this.onStateChange,
    );

    this._contextChangeSubscription = this._stateManager.contextChanged.subscribe(
      this.onContextChanged,
    );
  }

  public subscribe(subscriber: IStateManagerEventSubscriber): () => void {
    this.addSubscriber(subscriber.context, subscriber.index, subscriber);

    return () => {
      this.removeSubscriber(subscriber.context, subscriber.index, subscriber);
      this.tryDispose();
    };
  }

  private onStateChange = (change: IStateChange): void => {
    const subscribers = this._subscribersByContext
      .get(change.context)
      ?.get(change.index);
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    // Snapshot to avoid iteration instability if subscribers rebind/dispose.
    Array.from(subscribers).forEach((subscriber) => {
      subscriber.onStateChange(change);
    });
  };

  private onContextChanged = (change: IContextChanged): void => {
    const subscribers = this._subscribersByContext
      .get(change.oldContext)
      ?.get(change.index);
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const matchedSubscribers = Array.from(subscribers);
    matchedSubscribers.forEach((subscriber) => {
      this.removeSubscriber(change.oldContext, change.index, subscriber);
      subscriber.context = change.context;
      this.addSubscriber(change.context, change.index, subscriber);
      subscriber.onContextChanged(change);
    });
  };

  private addSubscriber(
    context: unknown,
    index: unknown,
    subscriber: IStateManagerEventSubscriber,
  ): void {
    let subscribersByIndex = this._subscribersByContext.get(context);
    if (!subscribersByIndex) {
      subscribersByIndex = new Map();
      this._subscribersByContext.set(context, subscribersByIndex);
    }

    let subscribers = subscribersByIndex.get(index);
    if (!subscribers) {
      subscribers = new Set();
      subscribersByIndex.set(index, subscribers);
    }

    subscribers.add(subscriber);
  }

  private removeSubscriber(
    context: unknown,
    index: unknown,
    subscriber: IStateManagerEventSubscriber,
  ): void {
    const subscribersByIndex = this._subscribersByContext.get(context);
    if (!subscribersByIndex) {
      return;
    }

    const subscribers = subscribersByIndex.get(index);
    if (!subscribers) {
      return;
    }

    subscribers.delete(subscriber);
    if (subscribers.size === 0) {
      subscribersByIndex.delete(index);
    }

    if (subscribersByIndex.size === 0) {
      this._subscribersByContext.delete(context);
    }
  }

  private tryDispose(): void {
    if (this._subscribersByContext.size > 0) {
      return;
    }

    this._changeSubscription.unsubscribe();
    this._contextChangeSubscription.unsubscribe();
    StateManagerEventRouter._routers.delete(this._stateManager);
  }
}

export class IndexValueObserver {
  private readonly _unsubscribeFromRouter: () => void;
  private readonly _changed = new ReplaySubject<IStateChange>(1);
  private _isDisposed = false;
  private _isWatchingState = false;

  constructor(
    private _context: unknown,
    private readonly _index: unknown,
    private readonly _indexWatchRule: IIndexWatchRule | undefined,
    private readonly _stateManager: IStateManager,
    private readonly setContext: (context: unknown) => void,
    ownerId: unknown,
  ) {
    this._unsubscribeFromRouter = StateManagerEventRouter.get(
      this._stateManager,
    ).subscribe({
      context: this._context,
      index: this._index,
      onStateChange: (change) => this._changed.next(change),
      onContextChanged: this.onContextChanged,
    });

    const value = Type.isReadonlyProperty(this._context, this._index)
      ? this._stateManager.getState(this._context, this._index)
      : this.watchState(ownerId);

    if (value !== undefined) {
      this._changed.next({
        index: this._index,
        context: this._context,
        oldContext: this._context,
        oldValue: undefined,
        newValue: value,
      });
    }
  }

  public get changed(): Observable<IStateChange> {
    return this._changed;
  }

  public dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._unsubscribeFromRouter();
    if (this._isWatchingState) {
      this._stateManager.releaseState(
        this._context,
        this._index,
        this._indexWatchRule,
      );
    }
    this._isDisposed = true;
  }

  public getValue(context: unknown, key: unknown): unknown {
    return this._stateManager.getState(context, key);
  }

  private onContextChanged = (change: IContextChanged) => {
    this._context = change.context;
    this.setContext(this._context);
  };

  private watchState(ownerId: unknown): unknown {
    this._isWatchingState = true;
    return this._stateManager.watchState(this._context, this._index, {
      indexWatchRule: this._indexWatchRule,
      ownerId,
    });
  }
}

export type IIdentifierBindConfiguration = IExpressionBindConfiguration & {
  currentValue?: unknown;
  isRoot?: boolean;
};

export class IdentifierExpression extends AbstractExpression {
  private _changeSubscription: Subscription | undefined;
  private _isBound = false;
  private _indexValueObserver: IndexValueObserver | undefined;
  private releaseMustProxifyHandler: (() => void) | undefined;
  private _commitAfterInitialized: boolean | undefined;
  private readonly _commitHandler: IExpressionChangeCommitHandler;
  private _context: unknown;
  private _indexWatchRule!: IIndexWatchRule | undefined;
  private _isAsync: boolean | undefined;

  constructor(
    expressionString: string,
    private readonly _indexValue?: unknown,
  ) {
    super(ExpressionType.Identifier, expressionString);

    this._commitHandler = {
      owner: this,
      commit: this.commit,
    };
  }

  public override get isAsync(): boolean | undefined {
    if (this._isAsync === undefined && this._context) {
      const value = this.indexValueAccessor.getValue(this._context, this.index);
      this._isAsync = this.valueMetadata.isAsync(value);
    }
    return this._isAsync;
  }

  private get index(): unknown {
    return this._indexValue ?? this.expressionString;
  }

  public setValue(value: unknown): void {
    this.indexValueAccessor.setValue(this._context, this.index, value);
  }

  public override clone(): this {
    return new (this.constructor as new (
      expressionString: string,
      indexValue?: unknown,
    ) => this)(this.expressionString, this._indexValue);
  }

  public override bind(
    settings: IIdentifierBindConfiguration,
  ): AbstractExpression {
    this._isBound = false;
    super.bind(settings);

    if (!settings.context) {
      return this;
    }

    this._context = this.identifierOwnerResolver.resolve(
      this.index,
      settings.context,
    );
    this._commitAfterInitialized = !settings.isRoot;

    this._indexWatchRule = new IndexWatchRule(
      this._context,
      this.shouldWatchIndex,
    );

    if (!this._indexValueObserver) {
      this.observeChange();
    } else {
      let newValue = settings.currentValue;
      if (newValue === undefined) {
        newValue = this._indexValueObserver.getValue(this._context, this.index);
      }
      if (newValue === undefined) {
        try {
          newValue = this.indexValueAccessor.getResolvedValue(
            this._context,
            this.index,
          );
        } catch {
          // Keep undefined for unresolved paths.
        }
      }

      this.onValueChanged({
        index: this.index,
        context: this._context,
        oldValue: this._value,
        newValue,
        oldContext: this._context,
      });
    }
    this._isBound = true;
    return this;
  }

  protected override internalDispose(): void {
    super.internalDispose();
    this.releaseMustProxifyHandler?.();
    this.disposeObserver();
    this._indexWatchRule = undefined;
  }

  protected override evaluate(): unknown {
    return this._value;
  }

  private get isLeaf(): boolean {
    return (
      !this.parent ||
      this.parent.childExpressions[this.parent.childExpressions.length - 1] ===
        this
    );
  }

  private get isMemberExpressionSegment(): boolean {
    return (
      this.parent?.type === ExpressionType.Member &&
      this.parent.childExpressions.includes(this)
    );
  }

  private shouldWatchIndex = (
    targetIndex: unknown,
    target: unknown,
  ): boolean => {
    const index = this.index;

    // Fast reject: rule-based watching only
    if (index !== targetIndex || this._context !== target) {
      return !!this.leafIndexWatchRule?.test(targetIndex, target);
    }

    const value = this.indexValueAccessor.getValue(target, index);

    if (!this.isLeaf && this.isMemberExpressionSegment) {
      return this.valueMetadata.needsProxy(value);
    }

    if (this.isLeaf) {
      return (
        this.valueMetadata.needsProxy(value) ||
        !!this.leafIndexWatchRule?.test(targetIndex, target)
      );
    }

    return false;
  };

  private observeChange(): void {
    const index = this.index;
    this._indexValueObserver = new IndexValueObserver(
      this._context,
      index,
      this._indexWatchRule,
      this.stateManager,
      (context) => (this._context = context),
      this.absoluteRoot,
    );

    this._changeSubscription = this._indexValueObserver.changed.subscribe(
      this.onValueChanged,
    );
  }

  private disposeObserver(): void {
    if (!this._changeSubscription) {
      return;
    }
    this._changeSubscription.unsubscribe();
    this._changeSubscription = undefined;
    this._indexValueObserver?.dispose();
    this._indexValueObserver = undefined;
  }

  private commit = (
    root: AbstractExpression,
    pendingCommits: Set<IExpressionChangeCommitHandler>,
  ) => this.reevaluated(this, root, pendingCommits);

  private onValueChanged = (stateChange: IStateChange) => {
    // if (this.value === stateChange.newValue) {
    //   return;
    // }
    this._oldValue = stateChange.oldValue;
    this._value = stateChange.newValue;

    this.transactionManager.registerChange(
      this.evaluationRoot,
      this._commitHandler,
    );

    if (!this._isBound && this._commitAfterInitialized) {
      this.transactionManager.commit();
    }
  };
}
