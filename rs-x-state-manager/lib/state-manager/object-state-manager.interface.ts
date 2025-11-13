import { ISingletonFactory } from '@rs-x/core';

export interface IState {
   value: unknown;
   valueCopy: unknown;
}

export interface IValueKey {
   key: unknown;
}
export interface IValueWithKey extends IValueKey {
   value: unknown;
}

export interface IStateForObjectManager
   extends ISingletonFactory<unknown, IValueWithKey, IState, IValueKey> {
   set(key: unknown, value: unknown): void;
}

export interface IObjectStateManager
   extends ISingletonFactory<unknown, unknown, IStateForObjectManager> {
   replaceState(
      key: unknown,
      newContext: unknown,
      newValue: unknown,
      oldContext
   ): void;
}
