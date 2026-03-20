import { Injectable } from '@rs-x/core';
import { Subject } from 'rxjs';
import { IEventObserver, IHandledEvent } from './event-observer.interface';

@Injectable()
export class EventObserver implements IEventObserver {
   public readonly eventHandled = new Subject<IHandledEvent>();
}
