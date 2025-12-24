import { IFunctionCallIndex } from '../function-call-index';
import { IDisposable } from '../types/disposable.interface';


export interface IFunctionCallResultIdInfo {
    arguments: unknown[];
    functionName: string;
}

export interface IFunctionCallResult extends IFunctionCallResultIdInfo {
    result: unknown;
}

export interface IFunctionCallResultCache extends IDisposable {
    readonly index: IFunctionCallIndex
    readonly result: unknown;
}

export interface IFunctionCallResultCacheFactory {
    create(context: unknown, result: IFunctionCallResult): IFunctionCallResultCache;
    has(context: unknown, index: IFunctionCallIndex): boolean;
    get(context: unknown, index: IFunctionCallIndex): IFunctionCallResultCache;
}