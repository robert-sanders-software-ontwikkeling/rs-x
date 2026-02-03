import { type ISingletonFactory } from '@rs-x/core';

export interface IState {
  value: unknown;
  valueCopy: unknown;
  watched: boolean;
}

export interface IValueKey {
  key: unknown;
}
export interface IValueWithKey extends IValueKey {
  value: unknown;
  watched: boolean;
}

export interface IStateForObjectManager extends ISingletonFactory<
  unknown,
  IValueWithKey,
  IState,
  IValueKey
> {
  set(key: unknown, value: unknown, watched: boolean): void;
}

export interface IObjectStateManager extends ISingletonFactory<
  unknown,
  unknown,
  IStateForObjectManager
> {
  replaceState(
    key: unknown,
    newContext: unknown,
    newValue: unknown,
    oldContext: unknown,
    watched: boolean,
  ): void;
  isRegistered(context: unknown, key: unknown): boolean;
}
