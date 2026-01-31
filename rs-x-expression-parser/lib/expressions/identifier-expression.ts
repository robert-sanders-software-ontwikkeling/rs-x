import { type Observable, ReplaySubject, Subject, type Subscription } from 'rxjs';

import { type IContextChanged, type IStateChange, type IStateManager, type ShouldWatchIndex } from '@rs-x/state-manager';

import { type IExpressionChangeCommitHandler } from '../expresion-change-transaction-manager.interface';

import {
   AbstractExpression
} from './abstract-expression';
import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';
import { ExpressionType } from './expression-parser.interface';

export class IndexValueObserver {
   private readonly _changeSubscription: Subscription;
   private readonly _contextChangeSubscription: Subscription;
   private readonly _changed = new ReplaySubject<IStateChange>(1);
   private readonly _contextChanged = new Subject<IContextChanged>();
   private _isDisposed = false;

   constructor(
      private _context: unknown,
      private readonly _key: unknown,
      private readonly _shouldWatchLeaf: ShouldWatchIndex | undefined,
      private readonly _stateManager: IStateManager,
   ) {
      this._changeSubscription = this._stateManager.changed.subscribe(
         this.emitChange
      );

      this._contextChangeSubscription =
         this._stateManager.contextChanged.subscribe(this.onContextCHanged);
      const value = this._stateManager.watchState(this._context, this._key, this._shouldWatchLeaf);

      if (value !== undefined) {
         this.emitChange({
            key: this._key,
            context: this._context,
            oldContext: this._context,
            oldValue: undefined,
            newValue: value
         });
      }
   }

   public get changed(): Observable<IStateChange> {
      return this._changed;
   }

   public get contextChanged(): Observable<IContextChanged> {
      return this._contextChanged;
   }

   public dispose(): void {
      if (this._isDisposed) {
         return;
      }
      this._changeSubscription.unsubscribe();
      this._contextChangeSubscription.unsubscribe();
      this._stateManager.releaseState(this._context, this._key, this._shouldWatchLeaf);
      this._isDisposed = true;
   }

   public getValue(context: unknown, key: unknown): unknown {
      return this._stateManager.getState(context, key);
   }

   private onContextCHanged = (change: IContextChanged) => {
      if (this._context === change.oldContext && change.key === this._key) {
         this._context = change.context;
         this._contextChanged.next(change);
      }
   };

   private emitChange = (change: IStateChange) => {
      if (this._context === change.context && change.key === this._key) {
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

   constructor(
      expressionString: string,
      private readonly _indexValue?: unknown,
   ) {
      super(ExpressionType.Identifier, expressionString);

      this._commitHandler = {
         owner: this,
         commit: this.commit
      };
   }

   public override clone(): this {
      return new (this.constructor as new (
         expressionString: string,
         indexValue?: unknown
      ) => this)(
         this.expressionString,
         this._indexValue
      );
   }

   public override bind(
      settings: IIdentifierBindConfiguration
   ): AbstractExpression {
      this._isBound = false;
      super.bind(settings);

      this._commitAfterInitialized = settings.context !== settings.rootContext;

      if (!this._indexValueObserver) {
         this.observeChange(settings);
      } else {
         const newValue = this._indexValueObserver.getValue(
            settings.context,
            this._indexValue ?? this.expressionString
         );
         this.onValueChanged({
            key: this._indexValue ?? this.expressionString,
            context: settings.context,
            oldValue: this._value,
            newValue,
            oldContext: settings.context,
         });
      }
      this._isBound = true;
      return this;
   }

   protected override internalDispose(): void {
      super.internalDispose();
      this.releaseMustProxifyHandler?.();
      this.disposeObserver();
   }

   protected override evaluate(): unknown {
      return this._value;
   }

   private observeChange(settings: IIdentifierBindConfiguration): void {
      const context = settings.context ?? settings.rootContext;
      const index = this._indexValue ?? this.expressionString;
    

      this._indexValueObserver = new IndexValueObserver(
         context,
         index,
         settings.shouldWatchLeaf,
         this.stateManager,
      );

      this._changeSubscription = this._indexValueObserver.changed.subscribe(
         this.onValueChanged
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

   private commit = (root: AbstractExpression, pendingCommits: Set<IExpressionChangeCommitHandler>) => this.reevaluated(this, root, pendingCommits);

   private onValueChanged = (stateChange: IStateChange) => {
      if (this.value === stateChange.newValue) {
         return;
      }
      this._value = stateChange.newValue;

      this.transactionManager.registerChange(this.root, this._commitHandler);

      if (!this._isBound && this._commitAfterInitialized) {
         this.transactionManager.commit();
      }
   };
}
