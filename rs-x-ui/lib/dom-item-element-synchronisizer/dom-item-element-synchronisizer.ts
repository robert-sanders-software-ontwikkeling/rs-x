import { IPropertyChange } from '@rs-x/core';
import { IElementData } from '../dom-element-data/element-data.interface';
import { ITemplatedElementFactories } from '../template/templated-element.factories.type';
import {
   IChildElementChanges,
   IDomItemElementSynchronizer,
} from './dom-item-element-synchronisizer.interfaces';
import { IElementFactory } from './element-factory.interface';


export class DomItemElementSynchronizer implements IDomItemElementSynchronizer {
   private _childNodes: Node[] = [];
   private _currentElementData = new Map<Node, unknown>();
   private _items!: unknown[];
   private readonly _itemElementFactory: IElementFactory;

   constructor(
      private readonly _itemFieldName: string,
      private readonly _template: HTMLTemplateElement,
      private readonly _templatedElementFactories: ITemplatedElementFactories
   ) {
      this._itemElementFactory = this._templatedElementFactories.create(
         this._template
      ).instance;
   }
   public dispose(): void {
      this._templatedElementFactories.release(this._template);
   }

   public get childNodes(): readonly Node[] {
      return this._childNodes;
   }

   public get items(): unknown[] {
      if (!this._items) {
         this._items = [];
      }
      return this._items;
   }

   public clear(): IChildElementChanges {
      return this.updateItems([]);
   }

   public updateItems(items: unknown[]): IChildElementChanges {
      this._items = items;
      return this.synchronize();
   }

   private createChildElementChanges(changes?: {
      addedElements?: IElementData[];
      deletedElements?: Node[];
      changedElements?: IElementData[];
   }): IChildElementChanges {
      return {
         addedElements: changes?.addedElements ?? [],
         deletedElements: changes?.deletedElements ?? [],
         changedElements: changes?.changedElements ?? [],
         currentElements: this._childNodes,
      };
   }

   private synchronize(): IChildElementChanges {
      const itemElements = this._childNodes as Element[];
      const addedElements: IElementData[] = [];
      const deletedElements: Element[] = [];
      const items = this.items;
      if (items.length < itemElements.length) {
         for (let i = items.length; i < itemElements.length; i++) {
            itemElements[i].remove();
            deletedElements.push(itemElements[i]);
         }
         this._childNodes.length = items.length;
      } else {
         for (let i = itemElements.length; i < items.length; i++) {
            addedElements.push({
               element: this.createItemElementAndAppend(
                  this._itemFieldName,
                  items[i]
               ),
               data: items[i],
               index: i,
            });
         }
      }

      const changedElements = this.getChangedElements();

      return this.createChildElementChanges({
         addedElements,
         deletedElements,
         changedElements,
      });
   }

   private getChangedElements(): IElementData[] {
      const changedElements: IElementData[] = [];
      const childElements = this._childNodes;
      const items = this.items;
      for (let i = 0; i < this._childNodes.length; i++) {
         const childElement = this._childNodes[i];
         const currentData = this._currentElementData.get(childElements[i]);
         if (items[i] !== currentData) {
            changedElements.push({
               element: childElement,
               data: items[i],
               index: i,
            });
            this._currentElementData.set(childElement, items[i]);
            this._itemElementFactory.setData(
               childElement as Element,
               this._itemFieldName,
               items[i]
            );
         }
      }
      return changedElements;
   }

   private addItemElements(items: unknown[]): IChildElementChanges {
      let currentIndex = this._childNodes.length;
      const addedElements = items.map((item) => {
         const addedElement = {
            element: this.createItemElementAndAppend(this._itemFieldName, item),
            data: item,
            index: currentIndex,
         };
         currentIndex++;
         return addedElement;
      });

      return this.createChildElementChanges({ addedElements });
   }

   private createItemElement(fieldName: string, item: unknown): Node {
      const itemElement = this._itemElementFactory.create(fieldName, item);
      this._currentElementData.set(itemElement, item);
      return itemElement;
   }

   private createItemElementAndAppend(fieldName: string, item: unknown): Node {
      const element = this.createItemElement(fieldName, item);
      this._template.parentElement!.appendChild(element);
      this._childNodes.push(element);
      return element;
   }

   private createItemElementAndPrepend(item: unknown): Node {
      const element = this.createItemElement(this._itemFieldName, item);
      this._template.parentElement!.prepend(element);
      this._childNodes.unshift(element);
      return element;
   }

   private deleteElements(start: number, count: number): IChildElementChanges {
      const deletedElements = this._childNodes.splice(start, count);
      deletedElements.forEach((element) => {
         this._currentElementData.delete(element);
         this._template.parentElement!.removeChild(element);
      });

      return this.createChildElementChanges({ deletedElements });
   }

   private set = (change: IPropertyChange): IChildElementChanges => {
      const index = change.arguments![0] as number;
      const element = this._childNodes[index];
      const data = change.arguments![1];
      this._currentElementData.set(element, data);

      return this.createChildElementChanges({
         changedElements: [{ element, data, index }],
      });
   };

   private splice = (change: IPropertyChange): IChildElementChanges => {
      if (change.arguments!.length > 2) {
         return this.synchronize();
      } else {
         return this.deleteElements(
            change.arguments![0] as number,
            change.arguments![1] as number
         );
      }
   };

   private handleItemsLengthChange = (
      change: IPropertyChange
   ): IChildElementChanges => {
      const difference =
         (change.arguments![0] as number) - this._childNodes.length;
      if (difference > 0) {
         return this.addItemElements(
            new Array(difference).fill(null, 0, difference)
         );
      } else if (difference < 0) {
         const deleteCount = Math.abs(difference);
         return this.deleteElements(
            this._childNodes.length - deleteCount,
            deleteCount
         );
      }
      return this.createChildElementChanges();
   };

   private readonly actions = {
      set: this.set,
      push: (change: IPropertyChange) => this.addItemElements(change.arguments!),
      splice: this.splice,
      reverse: () => this.reverseElements(),
      sort: () => this.reorderElements(),
      pop: () => this.deleteElements(this._childNodes.length - 1, 1),
      shift: () => this.deleteElements(0, 1),
      unshift: (change: IPropertyChange) =>
         this.insertElementsAtBeginning(change.arguments!),
      length: this.handleItemsLengthChange,
      fill: () => ({
         addedElements: [],
         deletedElements: [],
         changedElements: this.getChangedElements(),
         currentElements: this._childNodes,
      }),
   };

   private reverseElements(): IChildElementChanges {
      const parent = this._template.parentElement!;
      this._childNodes = this._childNodes.reverse();
      this._childNodes.forEach((child) => this.reappendChild(parent, child));

      return this.createChildElementChanges();
   }

   private reorderElements(): IChildElementChanges {
      const items = this.items;
      const parent = this._template.parentElement!;
      const childNodes: Node[] = [];
      const entries = Array.from(this._currentElementData.entries());
      for (let i = 0; i < items.length; i++) {
         const entry = entries.find((e) => e[1] === items[i]);
         if (entry) {
            this.reappendChild(parent, entry[0]);
            childNodes.push(entry[0]);
         }
      }
      this._childNodes = childNodes;

      return this.createChildElementChanges();
   }

   private reappendChild(parent: Node, child: Node): void {
      parent.removeChild(child);
      parent.appendChild(child);
   }

   private insertElementsAtBeginning(items: unknown[]): IChildElementChanges {
      let currentIndex = items.length - 1;
      const addedElements = items.reverse().map((item) => {
         const addedElement = {
            element: this.createItemElementAndPrepend(item),
            data: item,
            index: currentIndex,
         };
         currentIndex--;
         return addedElement;
      });

      return this.createChildElementChanges({ addedElements });
   }
}
