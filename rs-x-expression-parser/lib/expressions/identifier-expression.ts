import { emptyFunction, truePredicate } from '@rs-x/core';
import { IStateChange } from '@rs-x/state-manager';
import { Subscription } from 'rxjs';
import { IExpressionChangeCommitHandler, IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';
import { IIndexValueObserverManager } from '../index-value-observer-manager/index-value-manager-observer.type';
import { IIndexValueObserver } from '../index-value-observer-manager/index-value-observer.interface';
import {
   AbstractExpression,
   IExpressionInitializeConfig,
   IMustProxifyHandler,
} from './abstract-expression';
import { FunctionExpression } from './function-expression';
import { ExpressionType } from './interfaces';
import { MemberExpression } from './member-expression';

export interface IIdentifierInitializeConfig
   extends IExpressionInitializeConfig {
   currentValue?: unknown;
}

export class IdentifierExpression extends AbstractExpression {
   private _changeSubscription: Subscription;
   private _isInitialized = false;
   private _indexValueObserver: IIndexValueObserver;
   private releaseMustProxifyHandler: () => void;
   private _commitAfterInitialized: boolean;
   private readonly _commitHandler: IExpressionChangeCommitHandler;

   constructor(
      private readonly _rootContext: unknown,
      private readonly _indexValueObserverManager: IIndexValueObserverManager,
      expressionString: string,
      private readonly _expressionChangeTransactionManager: IExpressionChangeTransactionManager,
      private readonly _indexValue?: unknown,
   ) {
      super(ExpressionType.Identifier, expressionString);

      this._commitHandler = {
         owner: this,
         commit: this.commit
      };
   }

   public override initialize(
      settings: IIdentifierInitializeConfig
   ): AbstractExpression {
      super.initialize(settings);

      this._commitAfterInitialized = settings.context !== this._rootContext;
      this._value = settings.currentValue;
      if (!this._indexValueObserver) {
            this.observeChange(settings);
      } else {
         AbstractExpression.setValue(this, () =>
            this._indexValueObserver.getValue(
               settings.context,
               this._indexValue ?? this.expressionString
            )
         );
      }

      this._isInitialized = true;

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

   private observeChange(settings: IIdentifierInitializeConfig): void {
      const mustProxifyHandler =
         settings.mustProxifyHandler ?? this.getDefaultMustProxifyHandler();
      this.releaseMustProxifyHandler =
         mustProxifyHandler?.releaseMustProxifyHandler;
      const index = this._indexValue ?? this.expressionString;

      this._indexValueObserver = this._indexValueObserverManager
         .create({ context: settings.context ?? this._rootContext, index })
         .instance.create({
            index,
            mustProxify: mustProxifyHandler?.createMustProxifyHandler?.(),
         }).instance;

      this._changeSubscription = this._indexValueObserver.changed.subscribe(
         this.onValueChanged
      );
   }

   private getDefaultMustProxifyHandler(): IMustProxifyHandler {
      if (!this.parent || !(this.parent instanceof MemberExpression || this.parent instanceof FunctionExpression)) {
         return {
            createMustProxifyHandler: () => truePredicate,
            releaseMustProxifyHandler: emptyFunction,
         };
      }

      return {
         createMustProxifyHandler: () => undefined,
         releaseMustProxifyHandler: emptyFunction,
      };
   }

   private disposeObserver(): void {
      if (!this._changeSubscription) {
         return;
      }
      this._changeSubscription.unsubscribe();
      this._changeSubscription = undefined;
      this._indexValueObserver.dispose();
      this._indexValueObserver = undefined;
   }

   private commit = (root:AbstractExpression, pendingCommits: Set<IExpressionChangeCommitHandler>) => this.reevaluated(this, root, pendingCommits);

   private onValueChanged = (stateChange: IStateChange) => {
      if (this.value === stateChange.newValue) {
         return;
      }
      this._value = stateChange.newValue;
     
      this._expressionChangeTransactionManager.registerChange(this.root, this._commitHandler);

      if(!this._isInitialized && this._commitAfterInitialized) {
          this._expressionChangeTransactionManager.commit();
      }
   };
}
