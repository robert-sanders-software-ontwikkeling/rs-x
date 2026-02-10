import { type Observable } from 'rxjs';

import type { IIndexWatchRule } from '../index-watch-rule-registry/index-watch-rule.interface';

export interface IContextChanged {
  oldContext: unknown;
  context: unknown;
  index: unknown;
}
export interface IStateChange extends IContextChanged {
  oldValue: unknown;
  newValue?: unknown;
  watched?: boolean;
}

export interface IStateOptions {
  indexWatchRule?: IIndexWatchRule;
  ownerId?: unknown;
}

export interface IStateManager {
  readonly changed: Observable<IStateChange>;
  readonly contextChanged: Observable<IContextChanged>;
  readonly startChangeCycle: Observable<void>;
  readonly endChangeCycle: Observable<void>;
  isWatched(
    context: unknown,
    index: unknown,
    indexWatchRule?: IIndexWatchRule,
  ): boolean;
  watchState(
    context: unknown,
    index: unknown,
    options?: IStateOptions,
  ): unknown;
  releaseState(
    oontext: unknown,
    index: unknown,
    indexWatchRule?: IIndexWatchRule,
  ): void;
  getState<T>(context: unknown, index: unknown): T;
  setState<T>(
    context: unknown,
    index: unknown,
    value: T,
    ownerId: unknown,
  ): void;
  clear(): void;
}
