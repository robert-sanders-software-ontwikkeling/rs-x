import { injectable } from 'inversify';
import { BehaviorSubject, isObservable, Subject } from 'rxjs';
import { UnsupportedException } from '../exceptions';
import {
   IObservableAccessor,
   LastValuObservable,
} from './observable-accessor.interface';
import { PENDING } from './pending';

@injectable()
export class ObservableAccessor implements IObservableAccessor {
   public readonly priority = 2;
   private readonly _lastValues = new WeakMap<LastValuObservable, unknown>();

   public getIndexes(): IterableIterator<string> {
      return [].values()
   }

   public isAsync(): boolean {
      return true;
   }

   public getResolvedValue(context: unknown, index: string): unknown {
      return context instanceof BehaviorSubject
         ? context.value
         : (this._lastValues.get(context[index]) ?? PENDING);
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
      this._lastValues.set(observable, value);
   }

   public clearLastValue(observable: LastValuObservable): void {
      this._lastValues.delete(observable);
   }
}
