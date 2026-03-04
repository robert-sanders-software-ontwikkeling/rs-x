import { type IIndexValueAccessor } from './index-value-accessor.interface';

export type IGlobalIndexAccessor = IIndexValueAccessor<
  typeof globalThis,
  string
>;
