import { Injectable } from '@rs-x/core';
import { ResizeObserverCallback } from './resize-observer-callback.interface';
import { IResizeObserverFactory } from './resize-observer-factory.interface';
import { IResizeObserver } from './resize-observer.interface';

@Injectable()
export class ResizeObserverFactory implements IResizeObserverFactory {
   public create(callback: ResizeObserverCallback): IResizeObserver {
      return new ResizeObserver(callback);
   }
}
