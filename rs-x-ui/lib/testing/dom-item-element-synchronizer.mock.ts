import { Observable, Subject } from 'rxjs';
import {
   IChildElementChanges,
   IDomItemElementSynchronizer,
} from '../dom-item-element-synchronisizer/dom-item-element-synchronisizer.interfaces';

export class DomItemElementSynchronizerMock
   implements IDomItemElementSynchronizer
{
   public items: unknown[];
   public childNodes: readonly Node[] = [];
   public itemFieldName: string;
   private readonly _changed = new Subject<IChildElementChanges>();

   public get changed(): Observable<IChildElementChanges> {
      return this._changed;
   }

   public emitChanged(e: IChildElementChanges): void {
      return this._changed.next(e);
   }

   public readonly clear = jest.fn();
   public readonly dispose = jest.fn();
   public readonly updateItems = jest.fn();
}
