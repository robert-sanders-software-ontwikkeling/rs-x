export interface IWindowScroll {
   scrollX: number;
   scrollY: number;
   onscroll: ((this: GlobalEventHandlers, ev: Event) => unknown) | null;
   onmousewheel?: ((this: GlobalEventHandlers, ev: UIEvent) => unknown) | null;
}
