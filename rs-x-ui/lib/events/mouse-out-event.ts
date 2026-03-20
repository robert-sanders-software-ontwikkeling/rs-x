import { DomEvent } from './dom-event';

export class MouseOutEvent extends DomEvent<MouseEvent> {
   constructor(element: Element) {
      super('mouseout', element);
   }
}
