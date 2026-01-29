import { type IDisposableFunctionCallIndex, type IFunctionCallIndexData } from '../function-call-index';
import { type IISequenceWithIdData } from '../sequence-id';

import { SingletonFactoryMock } from './singleton-factory.mock';

export class FunctionCallIndexFactoryMock
  extends SingletonFactoryMock<
    IISequenceWithIdData,
    IFunctionCallIndexData,
    IDisposableFunctionCallIndex
  > {}