import { IDomWindow } from '../dom-window/dom-window.interface';
import { DomDocumentMock } from './dom-document.mock';
import { DomTimerMock } from './dom-timer.mock';

export class DomWindowMock extends DomTimerMock implements IDomWindow {
   public readonly document = new DomDocumentMock();
   public clientTop: number;
   public clientLeft: number;
   public height: number;
   public width: number;
   public scrollX: number;
   public scrollY: number;
   public innerHeight: number;
   public innerWidth: number;
   public onresize: () => void;
   public onscroll: () => void;
   public onmousewheel: () => void;
   public onblur: () => void;
   public onerror: OnErrorEventHandlerNonNull;
   public publiconunhandledrejection: (
      this: WindowEventHandlers,
      ev: PromiseRejectionEvent
   ) => unknown;
   public onunhandledrejection: (ev: PromiseRejectionEvent) => unknown;

   public readonly getSelection = jest.fn();
   public readonly getComputedStyle = jest.fn();
   public readonly addEventListener = jest.fn();
   public readonly removeEventListener = jest.fn();
}
