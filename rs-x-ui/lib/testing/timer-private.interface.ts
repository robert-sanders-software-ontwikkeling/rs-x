import { ITracker } from '@rs-x-core';
import { IDomTimer } from '../timer/dom-timer.interface';

export interface ITimerPrivate<T> extends ITracker<T, void> {
   _interval: number;
   _domTimer: IDomTimer;
   _data?: T;
}
