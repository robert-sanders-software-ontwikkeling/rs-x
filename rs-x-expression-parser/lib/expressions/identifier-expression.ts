import { emptyFunction, truePredicate } from '@rs-x/core';
import { IStateChange } from '@rs-x/state-manager';
import { Subscription } from 'rxjs';
import { IIndexValueObserverManager } from '../index-value-observer-manager/index-value-manager-observer.type';
import { IIndexValueObserver } from '../index-value-observer-manager/index-value-observer.interface';
import {
   AbstractExpression,
   IExpressionInitializeConfig,
   IMustProxifyHandler,
} from './abstract-expression';
import { ExpressionType } from './interfaces';
import { MemberExpression } from './member-expression';

export interface IIdentifierInitializeConfig
   extends IExpressionInitializeConfig {
   currentValue: unknown;
}

export class IdentifierExpression extends AbstractExpression {
   private _changeSubscription: Subscription;
   private _identifierValue: unknown;
   private _indexValueObserver: IIndexValueObserver;
   private releaseMustProxifyHandler: () => void;

   constructor(
      private readonly _rootContext: unknown,
      private readonly _indexValueObserverManager: IIndexValueObserverManager,
      private readonly onDispose: () => void,
      expressionString: string,
      private readonly _indexValue?: unknown
   ) {
      super(ExpressionType.Identifier, expressionString);
   }

   public override initialize(
      settings: IIdentifierInitializeConfig
   ): AbstractExpression {
      super.initialize(settings);
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

      return this;
   }

   public override dispose(): void {
      if (!this._changeSubscription) {
         return;
      }

      this.releaseMustProxifyHandler?.();

      super.dispose();
      this.disposeObserver();
      if (this.onDispose) {
         this.onDispose();
      }
   }

   protected override evaluateExpression(): unknown {
      return this._identifierValue;
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
      if (!this.parent || !(this.parent instanceof MemberExpression)) {
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

   private onValueChanged = (stateChange: IStateChange) => {
      if (this.value === stateChange.newValue) {
         return;
      }
      this._identifierValue = stateChange.newValue;
      this.evaluate(this, stateChange);
   };
}
