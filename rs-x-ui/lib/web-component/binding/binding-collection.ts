import {
   Inject,
   Injectable,
   removeFromArray,
} from '@rs-x/core';
import { 
   IExpression, 
   IExpressionChangeSubscriptionManager,
    IExpressionChangeTransactionManager, 
    RsXExpressionParserInjectionTokens 
} from '@rs-x/expression-parser';
import { Observable, Subject, Subscription } from 'rxjs';
import { IDomQuery } from '../../dom-query/dom-query.interface';
import { RsXUIInjectionTokens } from '../../rx-x-ui.injection-tokens';
import {
   BindingType,
   compareBinding,
   IBinding,
   IBindingCollection,
   IBindingsChanged,

   IChangedBindingValues,
} from './interfaces';

@Injectable()
export class BindingCollection implements IBindingCollection {
   private readonly _changed = new Subject<IBindingsChanged>();
   private readonly _valuesChanged = new Subject<IChangedBindingValues>();
   private readonly _bindings: IBinding[] = [];
   private readonly _changeSubscription: Subscription;

   constructor(
      @Inject(RsXUIInjectionTokens.IDomQuery)
      private readonly _domQuery: IDomQuery,
      @Inject(RsXExpressionParserInjectionTokens.IExpressionChangeSubscriptionManager)
      private readonly _expressionChangeSubscriptionManager: IExpressionChangeSubscriptionManager,
      @Inject(RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager)
      private readonly _expressionChangeTransactionManager: IExpressionChangeTransactionManager,
   ) {
      this._changeSubscription = _expressionChangeSubscriptionManager.changed.subscribe(this.onExpressionChanged)
   }

   public get valuesChanged(): Observable<IChangedBindingValues> {
      return this._valuesChanged;
   }

   public get changed(): Observable<IBindingsChanged> {
      return this._changed;
   }

   public get items(): IBinding[] {
      return this._bindings;
   }

   public suspendWatch(): void {
      this._expressionChangeTransactionManager.suspend();

   }

   public continueWatch(): void {
      this._expressionChangeTransactionManager.continue();
   }


   public getBindingsForElements(elements: Node[]): IBinding[] {
      return this._bindings
         .filter(
            (binding) =>
               elements.includes(binding.bindingOwnerElement as Node) ||
               elements.some((element) =>
                  this._domQuery.isAncestor(
                     element,
                     binding.bindingOwnerElement
                  )
               )
         )
         .sort(compareBinding);
   }

   public addRange(bindings: IBinding[]): void {
      const newItems = bindings.filter(
         (binding) => !this.items.some((item) => binding === item)
      );

      if (!newItems.length) {
         return;
      }
      this._bindings.push(...newItems);
      this.observeBindings(newItems);
      this.emitAdded(newItems);
   }

   public removeForElements(elements: Node[]): void {
      const bindingsToRemoved = this.getBindingsForElements(elements);
      bindingsToRemoved.forEach((binding) => this.remove(binding));
   }

   public dispose(): void {
      this._changeSubscription.unsubscribe();
      const toRemoved = [...this._bindings];
      this._bindings.length = 0;
      this.unobserveBindings(toRemoved);
   }

   private remove(binding: IBinding): void {
      if (removeFromArray(this.items, binding)) {
         this.unobserveBindings([binding]);
         this.emitRemoved([binding]);
      }
   }

   private emitAdded(addedBindings: IBinding[]): void {
      this.emitChanged(addedBindings, []);
   }

   private emitRemoved(removedBindings: IBinding[]): void {
      this.emitChanged([], removedBindings);
   }

   private emitChanged(added: IBinding[], removed: IBinding[]): void {
      if (added.length > 0 || removed.length > 0) {
         this._changed.next({
            added,
            removed,
         });
      }
   }

   private observeBindings(bindings: IBinding[]): void {
      bindings
         .forEach((binding) => {
            if (binding.bindingType === BindingType.TwoWay) {
               this._expressionChangeSubscriptionManager.create(binding.left);
            }
            if (binding.bindingType !== BindingType.OneTime ) {
                this._expressionChangeSubscriptionManager.create(binding.right);
            }
            return [];
         })
   }

   private unobserveBindings(bindings: IBinding[]): void {
      bindings.forEach(this.releaseBinding)
   }

   private releaseBinding = (binding: IBinding): void => {
      if (binding.bindingType === BindingType.TwoWay ) {
         this._expressionChangeSubscriptionManager.release(binding.left);
      }
      if (binding.bindingType !== BindingType.OneTime ) {
         this._expressionChangeSubscriptionManager.release(binding.right);
      }
      binding.dispose();
   };


   private isElementDetached(element: Element | Node): boolean {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const connector = element as any;
      return !!(connector?.customElement?.controller?.bindingManager?.isDetached);
   }

   private onExpressionChanged = (expression: IExpression) => {
      const rightToLeftBindings = this._bindings
         .filter((binding) => binding.right === expression)
         .filter((binding) => !this.isElementDetached(binding.bindingOwnerElement));

      const leftToRightBindings = this._bindings.filter(
         (binding) => binding.left === expression
      );

      if (
         (leftToRightBindings.length > 0 || rightToLeftBindings.length > 0) &&
         rightToLeftBindings.every((binding) => binding.right.value !== undefined)
      ) {
         this._valuesChanged.next({
            rightToLeftBindings,
            leftToRightBindings,
         });
      }
   };

}
