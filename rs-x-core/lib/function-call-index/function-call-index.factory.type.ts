import { IISequenceWithIdData, ISequenceWithId } from '../sequence-id';
import { ISingletonFactory } from '../singleton-factory/singleton.factory.interface';
import { IDisposableFunctionCallIndex, IFunctionCallIndexData } from './function-call-index.interface';


export type IFunctionCallIndexFactory = ISingletonFactory<IISequenceWithIdData, IFunctionCallIndexData, IDisposableFunctionCallIndex>;