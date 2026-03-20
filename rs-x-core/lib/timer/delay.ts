
import { Assertion } from '@rs-x/core';
import { AbstrackTracker } from '../tracker/abstract-tracker';
import { ISystemTimer } from './system-timer.interface';


export class Delay<T> extends AbstrackTracker<T, void> {
   private _timerId: number | undefined;

   constructor(
      private readonly _delay: number,
      private readonly _domTimer: ISystemTimer,
      private readonly _data?: T
   ) {
      super();
      Assertion.assertLargerThan(_delay, 0, 'delay');
   }

   protected attach(): void {
      this._timerId = this._domTimer.setTimeout(this.handleTick, this._delay);
   }

   protected detach(): void {
      if (this._timerId) {
         this._domTimer.clearTimeout(this._timerId);
      }
   }

   private handleTick = () => {
      this._timerId = undefined;
      this.emitTick(this._data);
   };
}
