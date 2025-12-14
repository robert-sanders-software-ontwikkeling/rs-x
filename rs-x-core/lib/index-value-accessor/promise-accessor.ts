import { injectable } from 'inversify';
import { UnsupportedException } from '../exceptions';
import { IPromiseAccessor } from './promise-accessor.interface';
import { PENDING } from './pending';

@injectable()
export class PromiseAccessor implements IPromiseAccessor {
   private readonly _lastValues = new WeakMap<Promise<unknown>, unknown>();

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
      return this._lastValues.get(context[index]) ?? PENDING;
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
      this._lastValues.set(promise, value);
   }

   public clearLastValue(promise: Promise<unknown>): void {
      this._lastValues.delete(promise);
   }
}
