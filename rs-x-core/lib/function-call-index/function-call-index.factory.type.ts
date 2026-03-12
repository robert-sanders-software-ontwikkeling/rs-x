import { type IKeyedInstanceFactory } from '../keyed-instance-factory/keyed-instance.factory.interface';
import { type IISequenceWithIdData } from '../sequence-id';

import {
  type IDisposableFunctionCallIndex,
  type IFunctionCallIndexData,
} from './function-call-index.interface';

export type IFunctionCallIndexFactory = IKeyedInstanceFactory<
  IISequenceWithIdData,
  IFunctionCallIndexData,
  IDisposableFunctionCallIndex
>;
