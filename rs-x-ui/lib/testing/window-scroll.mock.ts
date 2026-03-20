import { IWindowScroll } from '../dom-window/window-scroll.interface';

export class WindowScrollMock implements IWindowScroll {
   public scrollX: number;
   public scrollY: number;
   public onscroll: (this: GlobalEventHandlers, ev: Event) => unknown;
   public nmousewheel?: (this: GlobalEventHandlers, ev: UIEvent) => unknown;
}
