import { firstValueFrom, Observable, type Subscription } from 'rxjs';

interface WaitState<R> {
  results: R[];
  pending?: boolean;
  subscription?: Subscription;
  timerId: number;
}

export interface IWaitForEventOptions<
  TTarget extends { [K in TEventName]: Observable<TValue> },
  TEventName extends keyof TTarget,
  TValue,
> {
  count?: number;
  timeout?: number;
  ignoreInitialValue?: boolean;
}

export class WaitForEvent<
  TTarget extends { [K in TEventName]: Observable<TValue> },
  TEventName extends keyof TTarget,
  TValue,
> {
  private readonly _options: IWaitForEventOptions<TTarget, TEventName, TValue>;

  constructor(
    private readonly _target: TTarget,
    private readonly _eventName: TEventName,
    options?: IWaitForEventOptions<TTarget, TEventName, TValue>,
  ) {
    this._options = {
      count: options?.count ?? 1,
      timeout: options?.timeout ?? 100,
      ignoreInitialValue: options?.ignoreInitialValue ?? false,
    };
  }

  public wait(
    trigger: () => void | Promise<unknown> | Observable<unknown>,
  ): Promise<TValue | null> {
    const state: WaitState<TValue> = {
      results: [],
      pending: this._options.ignoreInitialValue,
      subscription: null!,
      timerId: 0,
    };

    return new Promise<TValue | null>((resolve, reject) => {
      state.timerId = window.setTimeout(() => {
        this.unsubscribeEvent(state);
        resolve(null); // timeout reached, no events
      }, this._options.timeout);

      state.subscription = this.subscribeToEvent(state, resolve, reject);

      this.runTrigger(trigger, state, reject);
    });
  }

  private subscribeToEvent(
    state: WaitState<TValue>,
    resolve: (value: TValue | null) => void,
    reject: (error: unknown) => void,
  ): Subscription {
    return this._target[this._eventName].subscribe({
      next: (value) => {
        if (
          state.pending ||
          state.results.length >= (this._options.count ?? 1)
        ) {
          state.pending = false;
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
    state: WaitState<TValue>,
    reject: (error: unknown) => void,
  ) {
    try {
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

  private finish(
    state: WaitState<TValue>,
    resolve: (value: TValue | null) => void,
  ) {
    this.cleanup(state);
    resolve(
      state.results.length > 1
        ? (state.results as unknown as TValue)
        : state.results[0],
    );
  }

  private cleanup(state: WaitState<TValue>) {
    window.clearTimeout(state.timerId);
    this.unsubscribeEvent(state);
  }

  private unsubscribeEvent(state: WaitState<TValue>) {
    if (state.subscription) {
      state.subscription.unsubscribe();
    }
  }
}
