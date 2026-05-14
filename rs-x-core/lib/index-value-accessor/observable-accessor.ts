import { isObservable, Subject } from 'rxjs';

import { Inject, Injectable } from '../dependency-injection';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';
import { Type } from '../types';

import type {
  IObservableAccessor,
  LastValueObservable,
} from './observable-accessor.interface';
import { PENDING } from './pending';
import type { IResolvedValueCache } from './resolved-value-cache.interface';

@Injectable()
export class ObservableAccessor implements IObservableAccessor {
  public readonly priority = 2;

  constructor(
    @Inject(RsXCoreInjectionTokens.IResolvedValueCache)
    private readonly _resolvedValueCache: IResolvedValueCache,
  ) {}

  public getIndexes(context: unknown): IterableIterator<string> {
    const obj = Type.toObject(this.getIndexContext(context));
    if (!obj) {
      return [].values();
    }
    return Object.keys(obj).values();
  }

  public getResolvedValue(context: unknown, index: string): unknown {
    const val = this.getIndexedValue(context, index);
    if ((val && typeof val === 'object') || typeof val === 'function') {
      return this._resolvedValueCache.get(val) ?? PENDING;
    }

    return this.hasIndexedValue(context, index) ? val : PENDING;
  }

  public hasValue(context: unknown, index: string): boolean {
    return this.getResolvedValue(context, index) !== PENDING;
  }

  public getValue(context: unknown, index: string): unknown {
    return this.getIndexedValue(context, index);
  }

  public setValue(context: unknown, index: string, value: unknown): void {
    const val = this.getIndexedValue(context, index);
    if (val instanceof Subject) {
      val.next(value);
      return;
    }
  }

  public applies(context: unknown, index: string): boolean {
    const val = this.getIndexedValue(context, index);
    return isObservable(val) || this.hasObservableIndexedValue(context, index);
  }

  public setLastValue(observable: LastValueObservable, value: unknown): void {
    this._resolvedValueCache.set(observable, value);
  }

  public clearLastValue(observable: LastValueObservable): void {
    this._resolvedValueCache.delete(observable);
  }

  private getIndexedValue(context: unknown, index: string): unknown {
    return (Type.toObject(this.getIndexContext(context)) ?? {})[index];
  }

  private hasIndexedValue(context: unknown, index: string): boolean {
    const obj = Type.toObject(this.getIndexContext(context));
    return !!obj && Type.hasProperty(obj, index);
  }

  private hasObservableIndexedValue(context: unknown, index: string): boolean {
    if (!isObservable(context)) {
      return false;
    }
    return this.hasIndexedValue(context, index);
  }

  private getIndexContext(context: unknown): unknown {
    if (!isObservable(context)) {
      return context;
    }
    const resolvedContext = this._resolvedValueCache.get(context);
    return resolvedContext === undefined ? context : resolvedContext;
  }
}
