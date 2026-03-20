import { ResizeObserverCallback } from './resize-observer-callback.interface';
import { IResizeObserver } from './resize-observer.interface';

export interface IResizeObserverFactory {
   create(callback: ResizeObserverCallback): IResizeObserver;
}
