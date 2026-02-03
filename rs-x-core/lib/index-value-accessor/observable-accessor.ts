import { BehaviorSubject, isObservable, Subject } from 'rxjs';

import { Inject, Injectable } from '../dependency-injection';
import { UnsupportedException } from '../exceptions';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';
import { Type } from '../types';

import type {
  IObservableAccessor,
  LastValuObservable,
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

  public getIndexes(): IterableIterator<string> {
    return [].values();
  }

  public getResolvedValue(context: unknown, index: string): unknown {
    if (context instanceof BehaviorSubject) return context.value;

    const val = this.getIndexedValue(context, index);
    if ((val && typeof val === 'object') || typeof val === 'function') {
      return this._resolvedValueCache.get(val) ?? PENDING;
    }

    return PENDING;
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

    throw new UnsupportedException('Cannot set value for an observable');
  }

  public applies(context: unknown, index: string): boolean {
    const val = this.getIndexedValue(context, index);
    return isObservable(val);
  }

  public setLastValue(observable: LastValuObservable, value: unknown): void {
    this._resolvedValueCache.set(observable, value);
  }

  public clearLastValue(observable: LastValuObservable): void {
    this._resolvedValueCache.delete(observable);
  }

  private getIndexedValue(context: unknown, index: string): unknown {
    return (Type.toObject(context) ?? {})[index];
  }
}
