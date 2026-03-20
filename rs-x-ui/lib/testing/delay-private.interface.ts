import { ITracker } from '@rs-x-core';
import { IDomTimer } from '../timer/dom-timer.interface';

export interface IDelayPrivate<T> extends ITracker<T, void> {
   _delay: number;
   _domTimer: IDomTimer;
   _data?: T;
}
