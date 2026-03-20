import { Subscription } from 'rxjs';

export interface IEventListner {
   eventName: string;
   listner: EventListenerOrEventListenerObject;
   sourceElement: Element;
   subscription?: Subscription;
}
