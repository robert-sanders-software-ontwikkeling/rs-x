import { DomEvent } from './dom-event';

export class MouseDownEvent extends DomEvent<MouseEvent> {
   constructor(element: Element) {
      super('mousedown', element);
   }
}
