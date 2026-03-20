import { IDisposable } from '@rs-x/core';
import { Observable } from 'rxjs';

export interface IElementRemovedObserver extends IDisposable {
   readonly removed: Observable<NodeList>;
   observer(target: Node): void;
}
