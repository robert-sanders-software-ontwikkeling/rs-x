import { injectable } from 'inversify';
import { Inject } from '../dependency-injection';
import { UnsupportedException } from '../exceptions';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';
import { PENDING } from './pending';
import type { IPromiseAccessor } from './promise-accessor.interface';
import type { IResolvedValueCache } from './resolved-value-cache.interface';

@injectable()
export class PromiseAccessor implements IPromiseAccessor {
   public readonly priority = 1;
   
   constructor(
      @Inject(RsXCoreInjectionTokens.IResolvedValueCache)
      private readonly _resolvedValueCache:IResolvedValueCache
   ) {
      
   }

   public getIndexes(): IterableIterator<string> {
      return [].values()
   }

   public isAsync(): boolean {
      return true;
   }

   public hasValue(context: Promise<unknown>, index: string): boolean {
      return this.getResolvedValue(context, index) !== PENDING
   }

   public getResolvedValue(context: unknown, index: string): unknown {
      return this._resolvedValueCache.get(context[index]) ?? PENDING;
   }

   public getValue(context: unknown, index: string): unknown {
      return context[index];
   }

   public setValue(): void {
      throw new UnsupportedException('Cannot set value for a Promise');
   }

   public applies(context: unknown, index: string): boolean {
      return context[index] instanceof Promise;
   }

   public setLastValue(promise: Promise<unknown>, value: unknown): void {
      this._resolvedValueCache.set(promise, value);
   }

   public clearLastValue(promise: Promise<unknown>): void {
      this._resolvedValueCache.delete(promise);
   }
}
