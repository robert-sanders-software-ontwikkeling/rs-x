import { type Observable } from 'rxjs';

import { type ShouldWatchIndex } from '../object-property-observer-proxy-pair-manager.type';

export interface IContextChanged {
  oldContext: unknown;
  context: unknown;
  key: unknown;
}
export interface IStateChange extends IContextChanged {
  oldValue: unknown;
  newValue?: unknown;
  watched?: boolean;
}

export interface IStateManager {
  readonly changed: Observable<IStateChange>;
  readonly contextChanged: Observable<IContextChanged>;
  readonly startChangeCycle: Observable<void>;
  readonly endChangeCycle: Observable<void>;
  isWatched(
    context: unknown,
    index: unknown,
    shouldWatchIndex?: ShouldWatchIndex,
  ): boolean;
  watchState(
    context: unknown,
    index: unknown,
    shouldWatchIndex?: ShouldWatchIndex,
  ): unknown;
  releaseState(
    oontext: unknown,
    index: unknown,
    shouldWatchIndex?: ShouldWatchIndex,
  ): void;
  getState<T>(context: unknown, index: unknown): T;
  setState<T>(context: unknown, index: unknown, value: T): void;
  clear(): void;
}
