import { Injectable, PreDestroy } from '@rs-x/core';
import { Observable, Subject } from 'rxjs';
import { IElementRemovedObserver } from './element-removed-observer.interface';

@Injectable()
export class ElementRemovedObserver implements IElementRemovedObserver {
   private readonly _mutationObserver: MutationObserver;
   private readonly _removed = new Subject<NodeList>();

   constructor() {
      this._mutationObserver = new MutationObserver(this.onChange);
   }

   @PreDestroy()
   public dispose(): void {
      this._mutationObserver.takeRecords();
      this._mutationObserver.disconnect();
   }

   public observer(target: Node): void {
      this._mutationObserver.observe(target);
   }

   public get removed(): Observable<NodeList> {
      return this._removed;
   }

   private onChange = (mutations: MutationRecord[]) => {
      mutations
         .filter(
            (mutation) =>
               mutation.type === 'childList' && mutation.removedNodes?.length
         )
         .forEach((mutation) => this._removed.next(mutation.removedNodes));
   };
}
