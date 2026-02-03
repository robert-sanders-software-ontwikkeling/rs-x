import { type IDisposableFunctionCallIndex } from '../function-call-index/function-call-index.interface';

import { type IIndexValueAccessor } from './index-value-accessor.interface';

export type IMethodAccessor = IIndexValueAccessor<
  object,
  IDisposableFunctionCallIndex
>;
