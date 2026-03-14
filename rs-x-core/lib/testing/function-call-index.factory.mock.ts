import {
  type IDisposableFunctionCallIndex,
  type IFunctionCallIndexData,
} from '../function-call-index';
import { type IISequenceWithIdData } from '../sequence-id';

import { KeyedInstanceFactoryMock } from './keyed-instance-factory.mock';

export class FunctionCallIndexFactoryMock extends KeyedInstanceFactoryMock<
  IISequenceWithIdData,
  IFunctionCallIndexData,
  IDisposableFunctionCallIndex
> {}
