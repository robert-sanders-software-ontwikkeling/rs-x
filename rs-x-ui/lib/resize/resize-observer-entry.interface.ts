import { IRect } from '@rs-x/core';

export interface IResizeObserverEntry {
   readonly target: Element;
   readonly boundingRect: IRect;
}
