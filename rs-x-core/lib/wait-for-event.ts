import { firstValueFrom, Observable, Subscription } from 'rxjs';

interface WaitState<R> {
   results: R[];
   pending?: boolean;
   subscription?: Subscription;
   timerId: number;
}

interface WaitOptions<
   T extends { [K in E]: Observable<R> },
   E extends keyof T,
   R,
> {
   count?: number;
   timeout?: number;
   ignoreInitialValue?: boolean;
}

export class WaitForEvent<
   T extends { [K in E]: Observable<R> },
   E extends keyof T,
   R,
> {
   private readonly _options: WaitOptions<T, E, R>;

   constructor(
      private readonly _target: T,
      private readonly _eventName: E,
      options?: WaitOptions<T, E, R>
   ) {
      this._options = {
         count: options?.count ?? 1,
         timeout: options?.timeout ?? 100,
         ignoreInitialValue: options?.ignoreInitialValue ?? false,
      };
   }

   public wait(
      trigger: () => void | Promise<unknown> | Observable<unknown>
   ): Promise<R | null> {
      const state: WaitState<R> = {
         results: [],
         pending: this._options.ignoreInitialValue,
         subscription: null!,
         timerId: 0,
      };

      return new Promise<R | null>((resolve, reject) => {
         state.timerId = window.setTimeout(() => {
            this.unsubscribeEvent(state);
            resolve(null); // timeout reached, no events
         }, this._options.timeout);

         state.subscription = this.subscribeToEvent(state, resolve, reject);

         this.runTrigger(trigger, state, reject);
      });
   }

   private subscribeToEvent(
      state: WaitState<R>,
      resolve: (value: R | null) => void,
      reject: (error: unknown) => void
   ): Subscription {
      return this._target[this._eventName].subscribe({
         next: (value) => {
            if (state.pending || state.results.length >= (this._options.count ?? 1)) {
               return;
            }

            state.results.push(value);

            if (state.results.length === this._options.count) {
               this.finish(state, resolve);
            }
         },
         error: (error) => {
            this.cleanup(state);
            reject(error);
         },
      });
   }

   private async runTrigger(
      trigger: () => void | Promise<unknown> | Observable<unknown>,
      state: WaitState<R>,
      reject: (error: unknown) => void
   ) {
      try {
         state.pending = false;
         const result = trigger();

         if (result instanceof Promise) {
            await result;
         } else if (result instanceof Observable) {
            await firstValueFrom(result);
         }
      } catch (error) {
         this.cleanup(state);
         reject(error);
      }
   }

   private finish(state: WaitState<R>, resolve: (value: R | null) => void) {
      this.cleanup(state);
      resolve(
         state.results.length > 1
            ? (state.results as unknown as R)
            : state.results[0]
      );
   }

   private cleanup(state: WaitState<R>) {
      window.clearTimeout(state.timerId);
      this.unsubscribeEvent(state);
   }

   private unsubscribeEvent(state: WaitState<R>) {
      if (state.subscription) {
         state.subscription.unsubscribe();
      }
   }
}
