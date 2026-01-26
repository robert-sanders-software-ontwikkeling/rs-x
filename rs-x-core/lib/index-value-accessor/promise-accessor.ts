import { Inject, Injectable } from '../dependency-injection';
import { UnsupportedException } from '../exceptions';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';
import { Type } from '../types';
import { PENDING } from './pending';
import type { IPromiseAccessor } from './promise-accessor.interface';
import type { IResolvedValueCache } from './resolved-value-cache.interface';

@Injectable()
export class PromiseAccessor implements IPromiseAccessor {
   public readonly priority = 1;

   constructor(
      @Inject(RsXCoreInjectionTokens.IResolvedValueCache)
      private readonly _resolvedValueCache: IResolvedValueCache
   ) { }

   public getIndexes(): IterableIterator<string> {
      return [].values();
   }

   public isAsync(): boolean {
      return true;
   }

   public hasValue(context: unknown, index: string): boolean {
      const val = this.getIndexedValue(context, index);
      return this.isCacheable(val) && this._resolvedValueCache.get(val) !== PENDING;
   }

   public getResolvedValue(context: unknown, index: string): unknown {
      const val = this.getIndexedValue(context, index);
      return this.isCacheable(val) ? this._resolvedValueCache.get(val) ?? PENDING : PENDING;
   }

   public getValue(context: unknown, index: string): unknown {
      return this.getIndexedValue(context, index);
   }

   public setValue(): void {
      throw new UnsupportedException('Cannot set value for a Promise');
   }

   public applies(context: unknown, index: string): boolean {
      const val = this.getIndexedValue(context, index);
      return val instanceof Promise;
   }

   public setLastValue(promise: Promise<unknown>, value: unknown): void {
      this._resolvedValueCache.set(promise, value);
   }

   public clearLastValue(promise: Promise<unknown>): void {
      this._resolvedValueCache.delete(promise);
   }

   private getIndexedValue(context: unknown, index: string): unknown {
      if (context && (typeof context === 'object' || typeof context === 'function')) {
         return Type.toObject(context)[index];
      }
      return undefined;
   }

   private isCacheable(value: unknown): value is object | Function {
      return value !== null && (typeof value === 'object' || typeof value === 'function');
   }
}