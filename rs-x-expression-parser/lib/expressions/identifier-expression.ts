import { type Observable, ReplaySubject, type Subscription } from 'rxjs';

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

export class IndexValueObserver {
  private readonly _changeSubscription: Subscription;
  private readonly _contextChangeSubscription: Subscription;
  private readonly _changed = new ReplaySubject<IStateChange>(1);
  private _isDisposed = false;

  constructor(
    private _context: unknown,
    private readonly _index: unknown,
    private readonly _indexWatchRule: IIndexWatchRule | undefined,
    private readonly _stateManager: IStateManager,
    private readonly setContext: (context: unknown) => void,
    ownerId: unknown,
  ) {
    this._changeSubscription = this._stateManager.changed.subscribe(
      this.emitChange,
    );

    this._contextChangeSubscription =
      this._stateManager.contextChanged.subscribe(this.onContextCHanged);
    const value = this._stateManager.watchState(this._context, this._index, {
      indexWatchRule: this._indexWatchRule,
      ownerId,
    });

    if (value !== undefined) {
      this.emitChange({
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
    this._changeSubscription.unsubscribe();
    this._contextChangeSubscription.unsubscribe();
    this._stateManager.releaseState(
      this._context,
      this._index,
      this._indexWatchRule,
    );
    this._isDisposed = true;
  }

  public getValue(context: unknown, key: unknown): unknown {
    return this._stateManager.getState(context, key);
  }

  private onContextCHanged = (change: IContextChanged) => {
    if (this._context === change.oldContext && change.index === this._index) {
      this._context = change.context;
      this.setContext(this._context);
    }
  };

  private emitChange = (change: IStateChange) => {
    if (this._context === change.context && change.index === this._index) {
      this._changed.next(change);
    }
  };
}

export type IIdentifierBindConfiguration = IExpressionBindConfiguration & {
  currentValue?: unknown;
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

  public setValue(value: unknown): void {
    this.indexValueAccessor.setValue(this._context,  this._indexValue ?? this.expressionString, value);
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

    this._context = settings.context ?? settings.rootContext;
    this._commitAfterInitialized = settings.context !== settings.rootContext;

    this._indexWatchRule = new IndexWatchRule(
      this._context,
      this.shouldWatchIndex,
    );

    if (!this._indexValueObserver) {
      this.observeChange();
    } else {
      const newValue = this._indexValueObserver.getValue(
        this._context,
        this._indexValue ?? this.expressionString,
      );
      this.onValueChanged({
        index: this._indexValue ?? this.expressionString,
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
    const index = this._indexValue ?? this.expressionString;

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
    const index = this._indexValue ?? this.expressionString;
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
    if (this.value === stateChange.newValue) {
      return;
    }
    this._oldValue = this._value;
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
