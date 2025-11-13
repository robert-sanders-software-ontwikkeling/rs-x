import { emptyFunction, IIndexValueAccessor, truePredicate } from '@rs-x/core';
import {
   IMustProxifyItemHandlerFactory,
   MustProxify,
} from '@rs-x/state-manager';
import { Subscription } from 'rxjs';
import { IIndexValueObserverManager } from '../index-value-observer-manager/index-value-manager-observer.type';
import {
   AbstractExpression,
   IExpressionInitializeConfig,
} from './abstract-expression';
import { IdentifierExpression } from './identifier-expression';
import { ExpressionType } from './interfaces';

interface IMustProxifyHandler {
   createMustProxifyHandler: () => MustProxify;
   releaseMustProxifyHandler: () => void;
   valid: boolean;
}

interface ISlotChangeSubscription {
   staticIndexExpression: IdentifierExpression;
   changeSubscription: Subscription;
   index: unknown;
   pathSegmentIndex: number;
}

export class MemberExpression extends AbstractExpression {
   private _slotObservers = new Map<
      AbstractExpression,
      ISlotChangeSubscription
   >();
   private _rebindingSlot = false;

   constructor(
      expressionString: string,
      private readonly _pathSeqments: AbstractExpression[],
      private readonly _indexValueAccessor: IIndexValueAccessor,
      private readonly _indexValueObserverManager: IIndexValueObserverManager,
      private readonly _mustProxifyItemHandlerFactory: IMustProxifyItemHandlerFactory
   ) {
      super(ExpressionType.Member, expressionString);

      _pathSeqments.forEach((e) => AbstractExpression.setParent(e, this));
   }

   public override initialize(
      settings: IExpressionInitializeConfig
   ): AbstractExpression {
      super.initialize(settings);

      for (let i = 0; i < this._pathSeqments.length; i++) {
         const currentSegment = this._pathSeqments[i];
         if (i === 0 || this.isCalculated(currentSegment)) {
            currentSegment.initialize({
               ...settings,
               mustProxifyHandler: this.getMustProxifyHandler(i),
            });
         }
      }

      return this;
   }

   public override dispose(): void {
      super.dispose();

      for (const slotObserver of this._slotObservers.values()) {
         this.disposeSlotObserver(slotObserver);
      }
      this._slotObservers.clear();
   }

   public resetChainFrom(from: AbstractExpression): void {
      for (
         let i = this._pathSeqments.indexOf(from) + 1;
         i < this._pathSeqments.length;
         i++
      ) {
         if (!this.isCalculated(this._pathSeqments[i])) {
            AbstractExpression.clearValue(this._pathSeqments[i]);
         }
      }
   }

   protected evaluateExpression(sender: AbstractExpression): unknown {
      const senderIndex = this._pathSeqments.indexOf(sender);
      if (senderIndex < 0) {
         return undefined;
      }

      const senderExpr = this._pathSeqments[senderIndex];
      if (senderExpr?.value === undefined) {
         return undefined;
      }

      let context = senderExpr.value;
      const startIndex = this.isCalculated(sender)
         ? senderIndex - 1
         : senderIndex + 1;

      let previousContext = this._pathSeqments[startIndex - 1]?.value;

      for (let i = startIndex; i < this._pathSeqments.length; i++) {
         const current = this._pathSeqments[i];
         const mustProxifyInfo = this.getMustProxifyHandler(i);

         if (!mustProxifyInfo.valid) {
            return undefined;
         }

         const newContext = this.resolveContext(
            current,
            previousContext,
            context,
            i,
            mustProxifyInfo
         );
         if (newContext === undefined) {
            return undefined;
         }

         previousContext = context = newContext;
      }

      return context;
   }

   private resolveContext(
      current: AbstractExpression,
      previousContext: unknown,
      context: unknown,
      index: number,
      mustProxifyInfo: IMustProxifyHandler
   ): unknown {
      if (this.isCalculated(current)) {
         return this.resolveCalculated(
            current,
            previousContext,
            context,
            index,
            mustProxifyInfo
         );
      }

      if (current.value !== undefined) {
         return current.value;
      }

      return this.resolveInitialized(current, previousContext, mustProxifyInfo);
   }

   private resolveCalculated(
      current: AbstractExpression,
      previousContext: unknown,
      context: unknown,
      index: number,
      mustProxifyInfo: IMustProxifyHandler
   ): unknown {
      const { value } = current;
      if (value === undefined) {
         return undefined;
      }

      const resolved = this._indexValueAccessor.getResolvedValue(
         context,
         value
      );
      this.observeSlot(
         previousContext,
         index,
         current,
         resolved,
         mustProxifyInfo
      );
      return resolved;
   }

   private resolveInitialized(
      current: AbstractExpression,
      previousContext: unknown,
      mustProxifyInfo: IMustProxifyHandler
   ): unknown {
      current.initialize({
         stateManager: undefined,
         context: previousContext,
         mustProxifyHandler: mustProxifyInfo,
      });

      if (current.value === undefined) {
         return undefined;
      }

      return current.value;
   }

   private disposeSlotObserver(
      slotChangeSubscription: ISlotChangeSubscription
   ): void {
      slotChangeSubscription.changeSubscription.unsubscribe();
      slotChangeSubscription.staticIndexExpression.dispose();
   }

   private getMustProxifyHandler(currentIndex: number): IMustProxifyHandler {
      const nextExpression = this._pathSeqments[currentIndex + 1];

      if (!nextExpression) {
         return this.createMustProxifyHandler(truePredicate);
      }

      if (nextExpression.type === ExpressionType.Identifier) {
         const isLast = nextExpression === this._pathSeqments.at(-1);
         return this.createMustProxifyHandler(
            isLast ? truePredicate : undefined
         );
      }

      if (nextExpression.value !== undefined) {
         return {
            releaseMustProxifyHandler: () =>
               this._mustProxifyItemHandlerFactory.release(
                  nextExpression.value
               ),
            createMustProxifyHandler: () =>
               this._mustProxifyItemHandlerFactory.create(nextExpression.value)
                  .instance,
            valid: true,
         };
      }

      return {
         releaseMustProxifyHandler: undefined,
         createMustProxifyHandler: undefined,
         valid: false,
      };
   }

   private createMustProxifyHandler(
      predicate?: typeof truePredicate
   ): IMustProxifyHandler {
      return {
         releaseMustProxifyHandler: emptyFunction,
         createMustProxifyHandler: () => predicate,
         valid: true,
      };
   }

   private observeSlot(
      context: unknown,
      pathSegmentIndex: number,
      dynamicIndexExpression: AbstractExpression,
      value: unknown,
      mustProxifyHandler: IMustProxifyHandler
   ): void {
      const slotObserver = this._slotObservers.get(dynamicIndexExpression);
      if (slotObserver) {
         if (dynamicIndexExpression.value === slotObserver.index) {
            return;
         }
         this.disposeSlotObserver(slotObserver);
         this._slotObservers.delete(dynamicIndexExpression);
         this._rebindingSlot = true;
      }

      const staticIndexExpression = new IdentifierExpression(
         context,
         this._indexValueObserverManager,
         emptyFunction,
         '',
         dynamicIndexExpression.value
      );
      // AbstractExpression.setParent(staticIndexExpression, this);
      const changeSubscription = staticIndexExpression.changed.subscribe(() =>
         this.onSlotChanged(dynamicIndexExpression)
      );
      staticIndexExpression.initialize({
         stateManager: undefined,
         currentValue: value,
         mustProxifyHandler: mustProxifyHandler,
      });
      this._slotObservers.set(dynamicIndexExpression, {
         staticIndexExpression,
         changeSubscription,
         index: dynamicIndexExpression.value,
         pathSegmentIndex,
      });
      this._rebindingSlot = false;
   }

   private onSlotChanged(dynamicIndexExpression: AbstractExpression): void {
      if (!this._rebindingSlot) {
         this.evaluate(dynamicIndexExpression);
      }
   }

   private isCalculated(expression: AbstractExpression): boolean {
      return expression.type === ExpressionType.Index;
   }
}
