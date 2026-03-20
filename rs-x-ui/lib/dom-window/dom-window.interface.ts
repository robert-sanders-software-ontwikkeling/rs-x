
import { ISystemTimer } from '@rs-x/core';
import { IDomDocument } from './dom-document.interface';
import { IErrorEvents } from './error-events.interface';
import { IWindowScroll } from './window-scroll.interface';

export interface IDomWindow extends IErrorEvents, ISystemTimer, IWindowScroll {
   readonly document: IDomDocument;
   clientTop: number;
   clientLeft: number;
   innerHeight: number;
   innerWidth: number;
   height: number;
   width: number;
   scrollY: number;
   scrollX: number;
   onresize: () => void;
   onblur: () => void;
   getSelection(): Selection | null;
   getComputedStyle(
      elt: Element,
      pseudoElt?: string | null
   ): CSSStyleDeclaration;
   addEventListener<K extends keyof WindowEventMap>(
      type: K,
      listener: (this: Window, ev: WindowEventMap[K]) => unknown,
      options?: boolean | AddEventListenerOptions
   ): void;
   addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
   ): void;
   removeEventListener<K extends keyof WindowEventMap>(
      type: K,
      listener: (this: Window, ev: WindowEventMap[K]) => unknown,
      options?: boolean | EventListenerOptions
   ): void;
   removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
   ): void;
}
