import { Inject, Injectable, ITracker, RsXCoreInjectionTokens } from '@rs-x/core';

import { Delay } from './delay';
import { Timer } from './timer';
import { ITimerFactory } from './timer.factory.interface';
import { ISystemTimer } from './system-timer.interface';


@Injectable()
export class TimerFactory implements ITimerFactory {
   constructor(
      @Inject(RsXCoreInjectionTokens.ISystemTimer)
      private readonly _domTimer: ISystemTimer
   ) {}

   public createDelay<T>(delay: number, data?: T): ITracker<T, void> {
      return new Delay(delay, this._domTimer, data);
   }

   public createTimer<T>(interval: number, data?: T): ITracker<T, void> {
      return new Timer(interval, this._domTimer, data);
   }
}
