import { Observable, Observer } from 'rxjs';
import { ITracker } from './tracker.interface';
export abstract class AbstrackTracker<TEventData, TSource>
   implements ITracker<TEventData, TSource>
{
   private _onTick!: Observable<TEventData | undefined> |null;
   private _onStop!: Observable<void> |null; 
   private _onTickObserver!: Observer<TEventData | undefined> |null;
   private _onStopObserver!: Observer<void> |null;
   private _isRunning = false;

   public get isRunning(): boolean {
      return this._isRunning;
   }

   public get onTick(): Observable<TEventData | undefined> {
      if (!this._onTick) {
         this._onTick = new Observable((observer: Observer<TEventData | undefined>) => {
            this._onTickObserver = observer;
         });
      }
      return this._onTick;
   }

   public get onStop(): Observable<void> {
      if (!this._onStop) {
         this._onStop = new Observable((observer: Observer<void>) => {
            this._onStopObserver = observer;
         });
      }
      return this._onStop;
   }

   public start(e?: TSource): void {
      if (!this._isRunning) {
         this._isRunning = true;
         this.attach(e);
      }
   }

   public stop(): void {
      if (this._isRunning) {
         if (this._onStopObserver) {
            this._onStopObserver.next();
            this._onStopObserver.complete();
         }
         if (this._onTickObserver) {
            this._onTickObserver.complete();
         }
         this.detach();
         this._onTick = null;
         this._onStop = null;
         this._onTickObserver = null;
         this._onStopObserver = null;
         this._isRunning = false;
      }
   }

   public dispose(): void {
      this.stop();
   }

   protected abstract attach(e?: TSource): void;

   protected abstract detach(): void;

   protected emitTick(e?: TEventData): void {
      if (this._onTickObserver) {
         this._onTickObserver.next(e);
      }
   }
}
