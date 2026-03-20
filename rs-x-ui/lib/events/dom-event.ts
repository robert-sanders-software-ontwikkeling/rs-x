import { AbstrackTracker } from '@rs-x/core';

export class DomEvent<T extends Event> extends AbstrackTracker<T, void> {
   constructor(
      private readonly _eventName: keyof HTMLElementEventMap,
      private readonly _element: Element
   ) {
      super();
   }

   protected attach(): void {
      this._element.addEventListener(this._eventName as string, this.eventHandler, false);
   }

   protected detach(): void {
      this._element.removeEventListener(this._eventName as string, this.eventHandler);
   }

   private eventHandler = (e: Event) => this.emitTick(e as T);
}
