import { Inject, Injectable } from '@rs-x/core';
import { Observable, Subject } from 'rxjs';
import { IResizeObserverEntry } from './resize-observer-entry.interface';
import { IResizeObserverFactory } from './resize-observer-factory.interface';
import { IResizeObserverService } from './resize-observer-service.interface';
import { IResizeObserver } from './resize-observer.interface';
import { RsXUIInjectionTokens } from '../rx-x-ui.injection-tokens';
import { Rect } from '../geometry/rect';

@Injectable()
export class ResizeObserverService implements IResizeObserverService {
   private readonly _observer: IResizeObserver;
   private readonly _onResized = new Subject<IResizeObserverEntry[]>();

   constructor(
      @Inject(RsXUIInjectionTokens.IResizeObserverFactory)
      resizeObserverFactory: IResizeObserverFactory
   ) {
      this._observer = resizeObserverFactory.create((entries) => {
         const resizedElements = entries.map((e) => ({
            target: e.target,
            boundingRect: new Rect({
               left: e.contentRect.left,
               top: e.contentRect.top,
               width: e.contentRect.width,
               height: e.contentRect.height,
            }),
         }));
         this._onResized.next(resizedElements);
      });
   }

   public observe(target: Element): void {
      this._observer.observe(target);
   }

   public get resized(): Observable<IResizeObserverEntry[]> {
      return this._onResized;
   }

   public unobserve(target: Element): void {
      this._observer.unobserve(target);
   }
}
