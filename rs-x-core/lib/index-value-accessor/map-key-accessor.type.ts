import { type IIndexValueAccessor } from './index-value-accessor.interface';

export type IMapKeyAccessor = IIndexValueAccessor<
   Map<unknown, unknown>,
   unknown
>;
