import { type Monaco } from '@monaco-editor/react';

export class RxjsMonacoTypesLoader {
  private static _instance: RxjsMonacoTypesLoader | null = null;
  private _installed = false;
  private static readonly GLOBAL_LIB_URI = 'file:///globals/rsx-global.d.ts';

  private constructor() {}

  public static getInstance(): RxjsMonacoTypesLoader {
    if (!this._instance) {
      this._instance = new RxjsMonacoTypesLoader();
    }
    return this._instance;
  }

  public async install(monaco: Monaco): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    // ✅ Use canonical API surface for Monaco TS/JS language service
    const ts = monaco.typescript;
    if (!ts) {
      return;
    }

    if (this._installed) {
      return;
    }

    // All types are declared inline in installGlobalApiTypes — no module
    // resolution needed, so we install immediately before anything async.
    this.installGlobalApiTypes(ts);

    ts.typescriptDefaults.setCompilerOptions({
      ...ts.typescriptDefaults.getCompilerOptions(),
      allowJs: true,
      checkJs: true,
      allowNonTsExtensions: true,
      allowReturnOutsideFunction: true,
    });
    ts.javascriptDefaults.setCompilerOptions({
      ...ts.javascriptDefaults.getCompilerOptions(),
      allowJs: true,
      checkJs: true,
      allowNonTsExtensions: true,
      allowReturnOutsideFunction: true,
    });

    this._installed = true;
  }

  private installGlobalApiTypes(ts: Monaco['typescript']): void {
    // All types are declared inline — no imports, no module resolution needed.
    // This is the same pattern used for the rsx/stateManager globals and is
    // the only reliable way to get completions in Monaco's JS/TS extra libs.
    const globalLib = `
      declare global {

        // -----------------------------------------------------------------
        // RxJS core types (inline — no import needed)
        // -----------------------------------------------------------------

        interface Unsubscribable {
          unsubscribe(): void;
        }

        interface SubscriptionLike extends Unsubscribable {
          readonly closed: boolean;
        }

        interface Observer<T> {
          next(value: T): void;
          error(err: unknown): void;
          complete(): void;
        }

        type PartialObserver<T> =
          | { next?: (value: T) => void; error?: (err: unknown) => void; complete?: () => void }
          | ((value: T) => void);

        interface Subscription extends SubscriptionLike {
          readonly closed: boolean;
          unsubscribe(): void;
          add(teardown: Unsubscribable | (() => void) | void): void;
        }

        interface Observable<T> {
          subscribe(observer?: PartialObserver<T>): Subscription;
          subscribe(next: (value: T) => void, error?: (err: unknown) => void, complete?: () => void): Subscription;
          pipe(): Observable<T>;
          pipe<A>(op1: OperatorFunction<T, A>): Observable<A>;
          pipe<A, B>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>): Observable<B>;
          pipe<A, B, C>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>): Observable<C>;
          pipe<A, B, C, D>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>): Observable<D>;
          pipe<A, B, C, D, E>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>): Observable<E>;
          pipe(...operators: OperatorFunction<unknown, unknown>[]): Observable<unknown>;
          toPromise(): Promise<T | undefined>;
        }

        interface Subject<T> extends Observable<T> {
          next(value: T): void;
          error(err: unknown): void;
          complete(): void;
          readonly closed: boolean;
          asObservable(): Observable<T>;
        }

        interface BehaviorSubject<T> extends Subject<T> {
          readonly value: T;
          getValue(): T;
        }

        interface ReplaySubject<T> extends Subject<T> {}

        type OperatorFunction<T, R> = (source: Observable<T>) => Observable<R>;
        type MonoTypeOperatorFunction<T> = OperatorFunction<T, T>;
        type ObservableInput<T> = Observable<T> | Promise<T> | Iterable<T> | ArrayLike<T>;

        // -----------------------------------------------------------------
        // RxJS operators (inline)
        // -----------------------------------------------------------------

        interface RxjsOperators {
          map<T, R>(project: (value: T, index: number) => R): OperatorFunction<T, R>;
          filter<T>(predicate: (value: T, index: number) => boolean): MonoTypeOperatorFunction<T>;
          switchMap<T, R>(project: (value: T, index: number) => ObservableInput<R>): OperatorFunction<T, R>;
          mergeMap<T, R>(project: (value: T, index: number) => ObservableInput<R>): OperatorFunction<T, R>;
          concatMap<T, R>(project: (value: T, index: number) => ObservableInput<R>): OperatorFunction<T, R>;
          exhaustMap<T, R>(project: (value: T, index: number) => ObservableInput<R>): OperatorFunction<T, R>;
          tap<T>(observer?: PartialObserver<T>): MonoTypeOperatorFunction<T>;
          tap<T>(next: (value: T) => void): MonoTypeOperatorFunction<T>;
          take<T>(count: number): MonoTypeOperatorFunction<T>;
          takeUntil<T>(notifier: ObservableInput<unknown>): MonoTypeOperatorFunction<T>;
          takeWhile<T>(predicate: (value: T, index: number) => boolean): MonoTypeOperatorFunction<T>;
          skip<T>(count: number): MonoTypeOperatorFunction<T>;
          skipUntil<T>(notifier: ObservableInput<unknown>): MonoTypeOperatorFunction<T>;
          debounceTime<T>(dueTime: number): MonoTypeOperatorFunction<T>;
          throttleTime<T>(duration: number): MonoTypeOperatorFunction<T>;
          distinctUntilChanged<T>(comparator?: (previous: T, current: T) => boolean): MonoTypeOperatorFunction<T>;
          distinctUntilKeyChanged<T, K extends keyof T>(key: K): MonoTypeOperatorFunction<T>;
          catchError<T, O extends ObservableInput<unknown>>(selector: (err: unknown, caught: Observable<T>) => O): OperatorFunction<T, T | unknown>;
          retry<T>(count?: number): MonoTypeOperatorFunction<T>;
          scan<T, R>(accumulator: (acc: R, value: T, index: number) => R, seed: R): OperatorFunction<T, R>;
          reduce<T, R>(accumulator: (acc: R, value: T, index: number) => R, seed: R): OperatorFunction<T, R>;
          startWith<T>(...values: T[]): MonoTypeOperatorFunction<T>;
          shareReplay<T>(bufferSize?: number): MonoTypeOperatorFunction<T>;
          share<T>(): MonoTypeOperatorFunction<T>;
          pairwise<T>(): OperatorFunction<T, [T, T]>;
          withLatestFrom<T, R>(other: ObservableInput<R>): OperatorFunction<T, [T, R]>;
          combineLatestWith<T, R>(other: ObservableInput<R>): OperatorFunction<T, [T, R]>;
          first<T>(predicate?: (value: T, index: number) => boolean): MonoTypeOperatorFunction<T>;
          last<T>(predicate?: (value: T, index: number) => boolean): MonoTypeOperatorFunction<T>;
          toArray<T>(): OperatorFunction<T, T[]>;
          finalize<T>(callback: () => void): MonoTypeOperatorFunction<T>;
          delay<T>(due: number): MonoTypeOperatorFunction<T>;
          timeout<T>(config: number | { each?: number; first?: number }): MonoTypeOperatorFunction<T>;
          bufferCount<T>(bufferSize: number, startBufferEvery?: number): OperatorFunction<T, T[]>;
          bufferTime<T>(bufferTimeSpan: number): OperatorFunction<T, T[]>;
          switchMapTo<T, R>(innerObservable: ObservableInput<R>): OperatorFunction<T, R>;
          mergeAll<T>(): OperatorFunction<ObservableInput<T>, T>;
          concatAll<T>(): OperatorFunction<ObservableInput<T>, T>;
          switchAll<T>(): OperatorFunction<ObservableInput<T>, T>;
          observeOn<T>(scheduler: unknown): MonoTypeOperatorFunction<T>;
          subscribeOn<T>(scheduler: unknown): MonoTypeOperatorFunction<T>;
          window<T>(windowBoundaries: Observable<unknown>): OperatorFunction<T, Observable<T>>;
          windowCount<T>(windowSize: number, startWindowEvery?: number): OperatorFunction<T, Observable<T>>;
          windowTime<T>(windowTimeSpan: number): OperatorFunction<T, Observable<T>>;
          groupBy<T, K>(keySelector: (value: T) => K): OperatorFunction<T, Observable<T> & { key: K }>;
          audit<T>(durationSelector: (value: T) => ObservableInput<unknown>): MonoTypeOperatorFunction<T>;
          auditTime<T>(duration: number): MonoTypeOperatorFunction<T>;
          count<T>(predicate?: (value: T, index: number) => boolean): OperatorFunction<T, number>;
          defaultIfEmpty<T>(defaultValue: T): MonoTypeOperatorFunction<T>;
          delayWhen<T>(delayDurationSelector: (value: T, index: number) => ObservableInput<unknown>): MonoTypeOperatorFunction<T>;
          distinct<T, K>(keySelector?: (value: T) => K): MonoTypeOperatorFunction<T>;
          elementAt<T>(index: number, defaultValue?: T): MonoTypeOperatorFunction<T>;
          endWith<T>(...values: T[]): MonoTypeOperatorFunction<T>;
          every<T>(predicate: (value: T, index: number) => boolean): OperatorFunction<T, boolean>;
          expand<T>(project: (value: T, index: number) => ObservableInput<T>, concurrent?: number): MonoTypeOperatorFunction<T>;
          find<T>(predicate: (value: T, index: number) => boolean): OperatorFunction<T, T | undefined>;
          findIndex<T>(predicate: (value: T, index: number) => boolean): OperatorFunction<T, number>;
          ignoreElements<T>(): OperatorFunction<T, never>;
          isEmpty<T>(): OperatorFunction<T, boolean>;
          mapTo<T, R>(value: R): OperatorFunction<T, R>;
          max<T>(comparer?: (x: T, y: T) => number): OperatorFunction<T, T>;
          min<T>(comparer?: (x: T, y: T) => number): OperatorFunction<T, T>;
          repeat<T>(count?: number): MonoTypeOperatorFunction<T>;
          retryWhen<T>(notifier: (errors: Observable<unknown>) => Observable<unknown>): MonoTypeOperatorFunction<T>;
          sample<T>(notifier: Observable<unknown>): MonoTypeOperatorFunction<T>;
          sampleTime<T>(period: number): MonoTypeOperatorFunction<T>;
          sequenceEqual<T>(compareTo: Observable<T>, comparator?: (a: T, b: T) => boolean): OperatorFunction<T, boolean>;
          single<T>(predicate?: (value: T, index: number) => boolean): MonoTypeOperatorFunction<T>;
          skipLast<T>(skipCount: number): MonoTypeOperatorFunction<T>;
          skipWhile<T>(predicate: (value: T, index: number) => boolean): MonoTypeOperatorFunction<T>;
          switchScan<T, R>(accumulator: (acc: R, value: T, index: number) => ObservableInput<R>, seed: R): OperatorFunction<T, R>;
          takeLast<T>(count: number): MonoTypeOperatorFunction<T>;
          timeInterval<T>(): OperatorFunction<T, { value: T; interval: number }>;
          timestamp<T>(): OperatorFunction<T, { value: T; timestamp: number }>;
          mergeScan<T, R>(accumulator: (acc: R, value: T, index: number) => ObservableInput<R>, seed: R, concurrent?: number): OperatorFunction<T, R>;
          onErrorResumeNextWith<T>(...sources: ObservableInput<T>[]): MonoTypeOperatorFunction<T>;
          zipWith<T, R>(other: ObservableInput<R>): OperatorFunction<T, [T, R]>;
        }

        // -----------------------------------------------------------------
        // rxjs global — all factory functions + operators + .op namespace
        // -----------------------------------------------------------------

        const rxjs: {
          // Core classes
          Observable: new <T>(subscribe?: (subscriber: Observer<T>) => void | (() => void)) => Observable<T>;
          Subject: new <T>() => Subject<T>;
          BehaviorSubject: new <T>(initialValue: T) => BehaviorSubject<T>;
          ReplaySubject: new <T>(bufferSize?: number) => ReplaySubject<T>;
          Subscription: new () => Subscription;

          // Creation operators
          of<T>(...values: T[]): Observable<T>;
          from<T>(input: ObservableInput<T>): Observable<T>;
          interval(period?: number): Observable<number>;
          timer(dueTime?: number, intervalDuration?: number): Observable<number>;
          combineLatest<T extends readonly ObservableInput<unknown>[]>(sources: [...T]): Observable<{ [K in keyof T]: T[K] extends ObservableInput<infer V> ? V : never }>;
          combineLatest<T extends ObservableInput<unknown>[]>(...sources: T): Observable<unknown[]>;
          merge<T>(...sources: ObservableInput<T>[]): Observable<T>;
          concat<T>(...sources: ObservableInput<T>[]): Observable<T>;
          zip<T extends readonly ObservableInput<unknown>[]>(sources: [...T]): Observable<{ [K in keyof T]: T[K] extends ObservableInput<infer V> ? V : never }>;
          zip<T>(...sources: ObservableInput<T>[]): Observable<T[]>;
          forkJoin<T extends Record<string, ObservableInput<unknown>>>(sources: T): Observable<{ [K in keyof T]: T[K] extends ObservableInput<infer V> ? V : never }>;
          forkJoin<T>(...sources: ObservableInput<T>[]): Observable<T[]>;
          race<T>(...sources: ObservableInput<T>[]): Observable<T>;
          iif<T, F>(condition: () => boolean, trueResult: ObservableInput<T>, falseResult: ObservableInput<F>): Observable<T | F>;
          defer<T>(observableFactory: () => ObservableInput<T>): Observable<T>;
          fromEvent<T>(target: unknown, eventName: string): Observable<T>;
          fromEventPattern<T>(addHandler: (handler: unknown) => unknown, removeHandler?: (handler: unknown, signal?: unknown) => void): Observable<T>;
          range(start: number, count?: number): Observable<number>;
          generate<T, S>(initialState: S, condition: (state: S) => boolean, iterate: (state: S) => S, resultSelector: (state: S) => T): Observable<T>;
          partition<T>(source: ObservableInput<T>, predicate: (value: T, index: number) => boolean): [Observable<T>, Observable<T>];
          onErrorResumeNext<T>(...sources: ObservableInput<T>[]): Observable<T>;
          pairs<T>(obj: Record<string, T>): Observable<[string, T]>;
          throwError(errorOrErrorFactory: unknown): Observable<never>;
          EMPTY: Observable<never>;
          NEVER: Observable<never>;
          animationFrames(): Observable<{ timestamp: number; elapsed: number }>;

          // Pipeable operators (available directly in RxJS 7)
          map: RxjsOperators['map'];
          filter: RxjsOperators['filter'];
          switchMap: RxjsOperators['switchMap'];
          mergeMap: RxjsOperators['mergeMap'];
          concatMap: RxjsOperators['concatMap'];
          exhaustMap: RxjsOperators['exhaustMap'];
          tap: RxjsOperators['tap'];
          take: RxjsOperators['take'];
          takeUntil: RxjsOperators['takeUntil'];
          takeWhile: RxjsOperators['takeWhile'];
          skip: RxjsOperators['skip'];
          skipUntil: RxjsOperators['skipUntil'];
          debounceTime: RxjsOperators['debounceTime'];
          throttleTime: RxjsOperators['throttleTime'];
          distinctUntilChanged: RxjsOperators['distinctUntilChanged'];
          distinctUntilKeyChanged: RxjsOperators['distinctUntilKeyChanged'];
          catchError: RxjsOperators['catchError'];
          retry: RxjsOperators['retry'];
          scan: RxjsOperators['scan'];
          reduce: RxjsOperators['reduce'];
          startWith: RxjsOperators['startWith'];
          shareReplay: RxjsOperators['shareReplay'];
          share: RxjsOperators['share'];
          pairwise: RxjsOperators['pairwise'];
          withLatestFrom: RxjsOperators['withLatestFrom'];
          combineLatestWith: RxjsOperators['combineLatestWith'];
          first: RxjsOperators['first'];
          last: RxjsOperators['last'];
          toArray: RxjsOperators['toArray'];
          finalize: RxjsOperators['finalize'];
          delay: RxjsOperators['delay'];
          timeout: RxjsOperators['timeout'];
          bufferCount: RxjsOperators['bufferCount'];
          bufferTime: RxjsOperators['bufferTime'];
          switchAll: RxjsOperators['switchAll'];
          switchMapTo: RxjsOperators['switchMapTo'];
          mergeAll: RxjsOperators['mergeAll'];
          concatAll: RxjsOperators['concatAll'];
          audit: RxjsOperators['audit'];
          auditTime: RxjsOperators['auditTime'];
          count: RxjsOperators['count'];
          defaultIfEmpty: RxjsOperators['defaultIfEmpty'];
          delayWhen: RxjsOperators['delayWhen'];
          distinct: RxjsOperators['distinct'];
          elementAt: RxjsOperators['elementAt'];
          endWith: RxjsOperators['endWith'];
          every: RxjsOperators['every'];
          expand: RxjsOperators['expand'];
          find: RxjsOperators['find'];
          findIndex: RxjsOperators['findIndex'];
          ignoreElements: RxjsOperators['ignoreElements'];
          isEmpty: RxjsOperators['isEmpty'];
          mapTo: RxjsOperators['mapTo'];
          max: RxjsOperators['max'];
          min: RxjsOperators['min'];
          repeat: RxjsOperators['repeat'];
          retryWhen: RxjsOperators['retryWhen'];
          sample: RxjsOperators['sample'];
          sampleTime: RxjsOperators['sampleTime'];
          sequenceEqual: RxjsOperators['sequenceEqual'];
          single: RxjsOperators['single'];
          skipLast: RxjsOperators['skipLast'];
          skipWhile: RxjsOperators['skipWhile'];
          switchScan: RxjsOperators['switchScan'];
          takeLast: RxjsOperators['takeLast'];
          timeInterval: RxjsOperators['timeInterval'];
          timestamp: RxjsOperators['timestamp'];
          mergeScan: RxjsOperators['mergeScan'];
          onErrorResumeNextWith: RxjsOperators['onErrorResumeNextWith'];
          zipWith: RxjsOperators['zipWith'];
          window: RxjsOperators['window'];
          windowCount: RxjsOperators['windowCount'];
          windowTime: RxjsOperators['windowTime'];
          groupBy: RxjsOperators['groupBy'];
          observeOn: RxjsOperators['observeOn'];
          subscribeOn: RxjsOperators['subscribeOn'];

          // .op namespace for explicit operator access
          op: RxjsOperators;
        };

        // -----------------------------------------------------------------
        // rs-x types (inline)
        // -----------------------------------------------------------------

        interface IIndexWatchRule {
          context: unknown;
          test(index: unknown, target: unknown): boolean;
        }

        type IndexWatchRulePredicate<TContext = unknown> = (
          index: unknown,
          target: unknown,
          context: TContext,
        ) => boolean;

        class IndexWatchRule<TContext = unknown> implements IIndexWatchRule {
          context: TContext;
          constructor(context: TContext, predicate: IndexWatchRulePredicate<TContext>);
          test(index: unknown, target: unknown): boolean;
        }

        const watchIndexRecursiveRule: IIndexWatchRule;

        interface IExpression<TReturn = unknown> {
          readonly changed: Observable<IExpression<TReturn>>;
          readonly value: TReturn | undefined;
          dispose(): void;
        }

        interface IExpressionChangeTransactionManager {
          suspend(): void;
          continue(): void;
          commit(): void;
        }

        interface IStateChange {
          index: unknown;
          context: unknown;
          oldContext: unknown;
          oldValue: unknown;
          newValue: unknown;
        }

        interface IStateManager {
          getState(context: unknown, index: unknown): unknown;
          setState(context: unknown, index: unknown, newValue: unknown, ownerId?: unknown): void;
          releaseState(context: unknown, index: unknown, indexWatchRule?: IIndexWatchRule): void;
          readonly changed: Observable<IStateChange>;
        }

        interface IWaitForEventOptions<
          TTarget extends { [K in TEventName]: Observable<TValue> },
          TEventName extends keyof TTarget,
          TValue,
        > {
          count?: number;
          timeout?: number;
          ignoreInitialValue?: boolean;
        }

        class WaitForEvent<
          TTarget extends { [K in TEventName]: Observable<TValue> },
          TEventName extends keyof TTarget,
          TValue,
        > {
          constructor(target: TTarget, eventName: TEventName, options?: IWaitForEventOptions<TTarget, TEventName, TValue>);
          wait(trigger: () => void | Promise<unknown> | Observable<unknown>): Promise<TValue | null>;
        }

        const rsx: <TReturn, TModel extends object = object>(
          expressionString: string,
        ) => (model: TModel, leafIndexWatchRule?: IIndexWatchRule) => IExpression<TReturn>;

        const printValue: (value: unknown) => void;
        const stateManager: IStateManager;
        const ExpressionChangeTransactionManager: IExpressionChangeTransactionManager;
      }

      export {};
    `;

    ts.typescriptDefaults.addExtraLib(
      globalLib,
      RxjsMonacoTypesLoader.GLOBAL_LIB_URI,
    );
    ts.javascriptDefaults.addExtraLib(
      globalLib,
      RxjsMonacoTypesLoader.GLOBAL_LIB_URI,
    );
  }
}
