import { IDisposableFunctionCallIndex } from '../function-call-index/function-call-index.interface';
import { IIndexValueAccessor } from './index-value-accessor.interface';

export type IMethodAccessor = IIndexValueAccessor<object, IDisposableFunctionCallIndex>;
