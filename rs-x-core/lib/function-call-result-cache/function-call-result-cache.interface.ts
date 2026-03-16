import { type IFunctionCallIndex } from '../function-call-index';
import { type IDisposable } from '../types/disposable.interface';

export interface IFunctionCallResultIdInfo {
  arguments: unknown[];
  functionName: string;
}

export interface IFunctionCallResult extends IFunctionCallResultIdInfo {
  result: unknown;
}

export interface IFunctionCallResultCacheEntry extends IDisposable {
  readonly index: IFunctionCallIndex;
  readonly result: unknown;
}

export interface IFunctionCallResultCache {
  create(
    context: unknown,
    result: IFunctionCallResult,
  ): IFunctionCallResultCacheEntry;
  has(context: unknown, index: IFunctionCallIndex): boolean;
  get(
    context: unknown,
    index: IFunctionCallIndex,
  ): IFunctionCallResultCacheEntry | undefined;
}
