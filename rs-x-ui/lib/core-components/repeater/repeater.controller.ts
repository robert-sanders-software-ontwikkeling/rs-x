import {
   ArrayObserver,
   getElements,
   IChildElementChanges,
   IDomItemElementSynchronizer,
} from '@rs-x/core';
import { forkJoin, Observable, Subscription } from 'rxjs';
import { IChangedBinding } from '../../web-component/binding/interfaces';
import { ICustomElementCoreServices } from '../../web-component/interfaces';
import { StructuralDirectiveController } from '../../web-component/structural-directive.controller';
import { IRepeaterController } from './repeater.interfaces';

export class RepeaterController
   extends StructuralDirectiveController
   implements IRepeaterController
{
   private readonly _changedSubscription: Subscription;
   private _items: unknown[] | ArrayObserver<unknown>;

   constructor(
      services: ICustomElementCoreServices,
      private readonly _domChildDataSynchronizer: IDomItemElementSynchronizer
   ) {
      super(services);

      this._changedSubscription =
         this._domChildDataSynchronizer.changed.subscribe(this.onChanged);
   }

   public get items(): unknown[] | ArrayObserver<unknown> {
      return this._domChildDataSynchronizer.items;
   }

   public set items(value: unknown[] | ArrayObserver<unknown>) {
      if (this.isAttached) {
         this._domChildDataSynchronizer.items = value;
      } else {
         this._items = value;
      }
   }

   public get itemFieldName(): string {
      return this._domChildDataSynchronizer.itemFieldName;
   }

   public set itemFieldName(value: string) {
      this._domChildDataSynchronizer.itemFieldName = value;
   }

   public get content(): readonly Node[] {
      return this._domChildDataSynchronizer.childNodes;
   }

   public buildContent(): void {
      if (this._items) {
         this._domChildDataSynchronizer.items = this._items;
         this._items = null;
      }
   }

   public detach(): void {
      super.detach();
      this._changedSubscription.unsubscribe();
   }

   private onChanged = (changes: IChildElementChanges) => {
      this.deleteElements(changes);

      const observables = [
         ...this.adddElements(changes),
         ...this.rebindChangedElements(changes),
      ];

      if (observables.length > 0) {
         forkJoin(observables).subscribe(() => this.emitEvent('itemsBound'));
      }
      // const observables: Observable<IChangedBinding[]>[] = [];

      // if (changes.addedElements.length > 0) {
      //    const addedElements = changes.addedElements.map(
      //       (addedElement) => addedElement.element
      //    );
      //    observables.push(this.bindingManager.attachBindings(addedElements));
      //    this.eventManager.bindEvents(getElements(addedElements));
      // }

      // if (changes.deletedElements.length > 0) {
      //    this.bindingManager.removeBindingsForElements(changes.deletedElements);
      //    this.eventManager.unbindEvents(getElements(changes.deletedElements));
      // }

      // if (changes.changedElements.length > 0) {
      //    const changedElements = changes.changedElements.map(
      //       (changedElement) => changedElement.element
      //    );
      //    changedElements.forEach((changedElement) =>
      //       this._dataElementData.unregister(changedElement)
      //    );
      //    observables.push(this.bindingManager.rebindElements(changedElements));
      // }

      // if (observables.length > 0) {
      //    forkJoin(observables).subscribe(() => this.emitEvent('itemsBound'));
      // }
   };

   private adddElements(
      changes: IChildElementChanges
   ): Observable<IChangedBinding[]>[] {
      const observables: Observable<IChangedBinding[]>[] = [];

      if (changes.addedElements.length > 0) {
         const addedElements = changes.addedElements.map(
            (addedElement) => addedElement.element
         );
         observables.push(this.bindingManager.attachBindings(addedElements));
         this.eventManager.bindEvents(getElements(addedElements));
      }
      return observables;
   }

   private deleteElements(changes: IChildElementChanges): void {
      if (changes.deletedElements.length > 0) {
         this.bindingManager.removeBindingsForElements(changes.deletedElements);
         this.eventManager.unbindEvents(getElements(changes.deletedElements));
      }
   }

   private rebindChangedElements(
      changes: IChildElementChanges
   ): Observable<IChangedBinding[]>[] {
      const observables: Observable<IChangedBinding[]>[] = [];
      if (changes.changedElements.length > 0) {
         const changedElements = changes.changedElements.map(
            (changedElement) => changedElement.element
         );
         observables.push(this.bindingManager.rebindElements(changedElements));
      }

      return observables;
   }
}
