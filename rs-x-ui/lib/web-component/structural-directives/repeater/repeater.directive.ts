import { IExpression } from '@rs-x/expression-parser';
import { Subscription } from 'rxjs';
import { Assertion } from '../../../../../rs-x-core/lib';
import { IChildElementChanges, IDomItemElementSynchronizer } from '../../../dom-item-element-synchronisizer/dom-item-element-synchronisizer.interfaces';
import { HtmlTagName } from '../../../html-elements/html-tag-name';
import { RsXUIInjectionTokens } from '../../../rx-x-ui.injection-tokens';
import { IBindingManagerFactory } from '../../binding/binding-manager.factory.type';
import { IEventManagerFactory } from '../../event-manager/event-manager.factory.type';
import { Directive } from '../directive-decorator/directive.decorator.function';
import { StructuralDirective } from '../structural-directive';

@Directive({
   name: 'repeater',
   appliesTo: [HtmlTagName.Template],
   factortyToken: RsXUIInjectionTokens.RepeaterDirectiveFactory,
})
export class RepeaterDirective extends StructuralDirective {
   private _changedSubscription: Subscription | null = null;
  
   constructor(
      element: Element,
      private readonly _itemsExpression: IExpression<unknown[]>,
      private readonly _domChildDataSynchronizer: IDomItemElementSynchronizer,
      bindingManagerFactory: IBindingManagerFactory,
      eventManagerFactory: IEventManagerFactory
   ) {
      super(element, bindingManagerFactory, eventManagerFactory);
   }

   protected async bindData(): Promise<void> {
      await this.watchItemsExpression();
      await this.updateItems();
   }

   protected unbindData(): void {
      this._itemsExpression.dispose();
      this._changedSubscription?.unsubscribe();
      this._changedSubscription = null;

      this._domChildDataSynchronizer.clear();
   }

   private async watchItemsExpression(): Promise<void> {
      this._changedSubscription = this._itemsExpression.changed.subscribe(
         this.onChanged
      );
   }

   private async updateItems(): Promise<void> {
      const items = this._itemsExpression.value ?? [];
      const changes = this._domChildDataSynchronizer.updateItems(items);
      this.applyChanges(changes);
      this.emitBound();
   }

   private applyChanges(changes: IChildElementChanges): void {

      Assertion.assertNotNullOrUndefined(this.bindingManager, 'this.bindingManager');
      Assertion.assertNotNullOrUndefined(this.eventManager, 'this.eventManager');
      if (changes.deletedElements.length > 0) {
         this.bindingManager.removeBindingsForElements(changes.deletedElements);
         this.eventManager.unbindEvents(changes.deletedElements as Element[]);
      }
      if (changes.addedElements.length > 0) {
         const addedNodes = changes.addedElements.map((e) => e.element);
         this.bindingManager.attachBindings(addedNodes);
         this.eventManager.bindEvents(addedNodes as Element[]);
      }
      if (changes.changedElements.length > 0) {
         const changedNodes = changes.changedElements.map((e) => e.element);
         this.bindingManager.rebindElements(changedNodes);
      }
   }

   private onChanged = async () => {
      await this.updateItems();
   };
}
