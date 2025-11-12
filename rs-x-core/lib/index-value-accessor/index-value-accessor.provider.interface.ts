import { IIndexValueAccessor } from './index-value-accessor.interface';

export interface IIndexValueAccessorProvider {
   get(context: unknown, index: unknown): IIndexValueAccessor<unknown, unknown>;
}
