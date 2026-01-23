import { type IISequenceWithIdData } from '../sequence-id';
import { type ISingletonFactory } from '../singleton-factory/singleton.factory.interface';
import { type IDisposableFunctionCallIndex, type IFunctionCallIndexData } from './function-call-index.interface';


export type IFunctionCallIndexFactory = ISingletonFactory<IISequenceWithIdData, IFunctionCallIndexData, IDisposableFunctionCallIndex>;