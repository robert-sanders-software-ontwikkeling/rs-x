import * as rxjs from 'rxjs';
import * as operators from 'rxjs/operators';

export type RxJsScope = {
  // Core
  Observable: typeof rxjs.Observable;
  Subject: typeof rxjs.Subject;
  BehaviorSubject: typeof rxjs.BehaviorSubject;
  ReplaySubject: typeof rxjs.ReplaySubject;
  AsyncSubject: typeof rxjs.AsyncSubject;

  // Creation
  of: typeof rxjs.of;
  from: typeof rxjs.from;
  interval: typeof rxjs.interval;
  timer: typeof rxjs.timer;
  defer: typeof rxjs.defer;
  EMPTY: typeof rxjs.EMPTY;
  NEVER: typeof rxjs.NEVER;
  throwError: typeof rxjs.throwError;
  combineLatest: typeof rxjs.combineLatest;
  forkJoin: typeof rxjs.forkJoin;
  merge: typeof rxjs.merge;
  concat: typeof rxjs.concat;
  race: typeof rxjs.race;

  // Utilities
  firstValueFrom: typeof rxjs.firstValueFrom;
  lastValueFrom: typeof rxjs.lastValueFrom;

  // Pipeable operators namespace
  map: typeof operators.map;
  filter: typeof operators.filter;
  switchMap: typeof operators.switchMap;
  mergeMap: typeof operators.mergeMap;
  concatMap: typeof operators.concatMap;
  exhaustMap: typeof operators.exhaustMap;
  tap: typeof operators.tap;
  debounceTime: typeof operators.debounceTime;
  throttleTime: typeof operators.throttleTime;
  distinctUntilChanged: typeof operators.distinctUntilChanged;
  catchError: typeof operators.catchError;
  take: typeof operators.take;
  takeUntil: typeof operators.takeUntil;
  skip: typeof operators.skip;
  timeout: typeof operators.timeout;
  finalize: typeof operators.finalize;
  share: typeof operators.share;
  shareReplay: typeof operators.shareReplay;
  startWith: typeof operators.startWith;
  scan: typeof operators.scan;
};

export const rxjsScope: RxJsScope = {
  // Core
  Observable: rxjs.Observable,
  Subject: rxjs.Subject,
  BehaviorSubject: rxjs.BehaviorSubject,
  ReplaySubject: rxjs.ReplaySubject,
  AsyncSubject: rxjs.AsyncSubject,

  // Creation
  of: rxjs.of,
  from: rxjs.from,
  interval: rxjs.interval,
  timer: rxjs.timer,
  defer: rxjs.defer,
  EMPTY: rxjs.EMPTY,
  NEVER: rxjs.NEVER,
  throwError: rxjs.throwError,
  combineLatest: rxjs.combineLatest,
  forkJoin: rxjs.forkJoin,
  merge: rxjs.merge,
  concat: rxjs.concat,
  race: rxjs.race,

  // Utilities
  firstValueFrom: rxjs.firstValueFrom,
  lastValueFrom: rxjs.lastValueFrom,

  // Operators
  map: operators.map,
  filter: operators.filter,
  switchMap: operators.switchMap,
  mergeMap: operators.mergeMap,
  concatMap: operators.concatMap,
  exhaustMap: operators.exhaustMap,
  tap: operators.tap,
  debounceTime: operators.debounceTime,
  throttleTime: operators.throttleTime,
  distinctUntilChanged: operators.distinctUntilChanged,
  catchError: operators.catchError,
  take: operators.take,
  takeUntil: operators.takeUntil,
  skip: operators.skip,
  timeout: operators.timeout,
  finalize: operators.finalize,
  share: operators.share,
  shareReplay: operators.shareReplay,
  startWith: operators.startWith,
  scan: operators.scan,
};
