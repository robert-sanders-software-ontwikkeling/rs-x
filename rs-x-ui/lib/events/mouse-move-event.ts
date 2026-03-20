import { DomEvent } from './dom-event';

export class MouseMoveEvent extends DomEvent<MouseEvent> {
   constructor(element: Element) {
      super('mousemove', element);
   }
}
