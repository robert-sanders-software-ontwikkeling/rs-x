import { Observable } from 'rxjs';
import { MustProxify } from '../object-property-observer-proxy-pair-manager.type';

export interface IContextChanged {
   oldContext: unknown;
   context: unknown;
   key: unknown;
}
export interface IStateChange extends IContextChanged {
   oldValue: unknown;
   newValue?: unknown;
}

export interface IStateManager {
   readonly changed: Observable<IStateChange>;
   readonly contextChanged: Observable<IContextChanged>;
   readonly startChangeCycly: Observable<void>;
   readonly endChangeCycly: Observable<void>;
   isRegistered(
      context: unknown,
      index: unknown,
      mustProxify?: MustProxify
   ): boolean;
   register(context: unknown, index: unknown, mustProxify?: MustProxify): unknown;
   unregister(oontext: unknown, index: unknown, mustProxify?: MustProxify): void;
   getState<T>(context: unknown, index: unknown): T;
   clear(): void;
}
