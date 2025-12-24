import { IDisposableFunctionCallIndex, IFunctionCallIndexData } from '../function-call-index';
import { IISequenceWithIdData } from '../sequence-id';
import { SingletonFactoryMock } from './singleton-factory.mock';

export class FunctionCallIndexFactoryMock
  extends SingletonFactoryMock<
    IISequenceWithIdData,
    IFunctionCallIndexData,
    IDisposableFunctionCallIndex
  > {}