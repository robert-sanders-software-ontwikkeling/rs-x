import { injectable } from 'inversify';
import { BehaviorSubject, isObservable, Subject } from 'rxjs';
import { UnsupportedException } from '../exceptions';
import {
   IObservableAccessor,
   LastValuObservable,
} from './observable-accessor.interface';
import { PENDING } from './pending';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';
import { Inject } from '../dependency-injection';
import { IResolvedValueCache } from './resolved-value-cache.interface';

@injectable()
export class ObservableAccessor implements IObservableAccessor {
   public readonly priority = 2;

   constructor(
      @Inject(RsXCoreInjectionTokens.IResolvedValueCache)
      private readonly _resolvedValueCache: IResolvedValueCache
   ) {

   }

   public getIndexes(): IterableIterator<string> {
      return [].values()
   }

   public isAsync(): boolean {
      return true;
   }

   public getResolvedValue(context: unknown, index: string): unknown {
      return context instanceof BehaviorSubject
         ? context.value
         : (this._resolvedValueCache.get(context[index]) ?? PENDING);
   }

   public hasValue(context: LastValuObservable, index: string): boolean {
      return this.getResolvedValue(context, index) !== PENDING
   }

   public getValue(context: unknown, index: string): unknown {
      return context[index];
   }

   public setValue(context: unknown, index: string, value: unknown): void {
      if (context[index] instanceof Subject) {
         context[index].next(value);
      }

      throw new UnsupportedException('Cannot set value for an observable');
   }

   public applies(context: unknown, index: string): boolean {
      return isObservable(context[index]);
   }

   public setLastValue(observable: LastValuObservable, value: unknown): void {
      this._resolvedValueCache.set(observable, value);
   }

   public clearLastValue(observable: LastValuObservable): void {
      this._resolvedValueCache.delete(observable);
   }
}
