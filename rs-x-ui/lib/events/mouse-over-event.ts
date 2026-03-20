import { DomEvent } from './dom-event';

export class MouseOverEvent extends DomEvent<MouseEvent> {
   constructor(element: Element) {
      super('mouseover', element);
   }
}
