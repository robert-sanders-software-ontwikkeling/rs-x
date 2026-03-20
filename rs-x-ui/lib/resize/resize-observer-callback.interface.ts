import { IResizeObserver } from './resize-observer.interface';

export interface ResizeObserverEntry {
   readonly target: Element;
   readonly contentRect: DOMRectReadOnly;
}

export type ResizeObserverCallback = (
   entries: ResizeObserverEntry[],
   observer: IResizeObserver
) => void;
