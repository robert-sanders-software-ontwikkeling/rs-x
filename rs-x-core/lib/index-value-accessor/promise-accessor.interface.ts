import { IIndexValueAccessor } from './index-value-accessor.interface';

export interface IPromiseAccessor
   extends IIndexValueAccessor<Promise<unknown>, unknown> {
   setLastValue(promise: Promise<unknown>, value: unknown): void;
   clearLastValue(promise: Promise<unknown>): void;
}
