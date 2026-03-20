import { Assertion } from '@rs-x/core';
import { AbstrackTracker } from '../tracker/abstract-tracker';
import { ISystemTimer } from './system-timer.interface';


export class Timer<T> extends AbstrackTracker<T, void> {
   private _timerId: number | undefined;

   constructor(
      private readonly _interval: number,
      private readonly _systemTimer: ISystemTimer,
      private readonly _data?: T
   ) {
      super();
      Assertion.assertLargerThan(_interval, 0, 'interval');
   }

   protected attach(): void {
      this._timerId = this._systemTimer.setInterval(
         () => this.emitTick(this._data),
         this._interval
      );
   }

   protected detach(): void {
      if (this._timerId) {
         this._systemTimer.clearInterval(this._timerId);
         this._timerId = undefined;
      }
   }
}
