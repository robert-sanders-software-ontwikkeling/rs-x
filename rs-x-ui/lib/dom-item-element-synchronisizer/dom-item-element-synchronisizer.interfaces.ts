import { IDisposable } from '@rs-x/core';
import { IElementData } from '../dom-element-data/element-data.interface';

export interface IChildElementChanges {
   addedElements: IElementData[];
   deletedElements: Node[];
   changedElements: IElementData[];
   currentElements: Node[];
}

export interface IDomItemElementSynchronizer extends IDisposable {
   readonly items: unknown[];
   readonly childNodes: readonly Node[];
   updateItems(items: unknown[]): IChildElementChanges;
   clear(): IChildElementChanges;
}
