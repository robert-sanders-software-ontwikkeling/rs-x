import { type IISequenceWithIdData } from '../sequence-id/sequence-id-factory.interface';
import { type IDisposable } from '../types/disposable.interface';

export interface  IFunctionCallIndexData {
    readonly context: unknown;
    readonly functionName: string;
    readonly arguments: unknown[];
}

export interface IFunctionCallIndex  {
      readonly context: unknown;
      readonly functionName: string;
      readonly argumentsId: IISequenceWithIdData;
      readonly id: string;
}


export interface IDisposableFunctionCallIndex extends IFunctionCallIndex, IDisposable {
      readonly context: unknown;
      readonly functionName: string;
      readonly argumentsId: IISequenceWithIdData;
      readonly id: string;
}

