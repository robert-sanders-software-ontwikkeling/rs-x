import { Subject } from 'rxjs';

export interface IHandledEvent {
   result?: unknown;
   sender: object;
   eventArgs: unknown;
   eventName: string;
}

export interface IEventObserver {
   readonly eventHandled: Subject<IHandledEvent>;
}
