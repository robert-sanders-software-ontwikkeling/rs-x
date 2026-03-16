import { Inject, Injectable } from '../dependency-injection';
import type { IFunctionCallIndexFactory } from '../function-call-index';
import type {
  IDisposableFunctionCallIndex,
  IFunctionCallIndex,
} from '../function-call-index/function-call-index.interface';
import type { IDisposableOwner } from '../keyed-instance-factory';
import { KeyedInstanceFactory } from '../keyed-instance-factory/keyed-instance.factory';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';

import type {
  IFunctionCallResult,
  IFunctionCallResultCache,
  IFunctionCallResultCacheEntry,
  IFunctionCallResultIdInfo,
} from './function-call-result-cache.interface';

class FunctionCallResultCacheEntry implements IFunctionCallResultCacheEntry {
  private _isDisposed = false;

  constructor(
    private readonly _disposeableIndex: IDisposableFunctionCallIndex,
    public readonly result: unknown,
    private readonly _owner: IDisposableOwner,
  ) {}

  public get index(): IFunctionCallIndex {
    return this._disposeableIndex;
  }

  public dispose(): void {
    if (this._isDisposed) {
      return;
    }

    if (this._owner.canDispose?.()) {
      this._disposeableIndex.dispose();
      this._isDisposed = true;
    }

    this._owner.release();
  }
}

class FunctionCallResultCacheForContextManager extends KeyedInstanceFactory<
  IFunctionCallIndex,
  IFunctionCallResult,
  IFunctionCallResultCacheEntry,
  IFunctionCallResultIdInfo
> {
  constructor(
    private readonly _context: unknown,
    private readonly _functionCallIndexFactory: IFunctionCallIndexFactory,
    private readonly releaseContext: () => void,
  ) {
    super();
  }

  public override getId(
    data: IFunctionCallResultIdInfo,
  ): IDisposableFunctionCallIndex {
    return this._functionCallIndexFactory.getFromData({
      functionName: data.functionName,
      context: this._context,
      arguments: data.arguments,
    }) as IDisposableFunctionCallIndex;
  }

  protected override createInstance(
    data: IFunctionCallResult,
    id: IDisposableFunctionCallIndex,
  ): IFunctionCallResultCacheEntry {
    return new FunctionCallResultCacheEntry(id, data.result, {
      canDispose: () => this.getReferenceCount(id) === 1,
      release: () => this.release(id),
    });
  }

  protected override createId(
    data: IFunctionCallResultIdInfo,
  ): IDisposableFunctionCallIndex {
    return this._functionCallIndexFactory.create({
      functionName: data.functionName,
      context: this._context,
      arguments: data.arguments,
    }).instance;
  }

  protected override releaseInstance(
    _: IFunctionCallResultCacheEntry,
    id: IDisposableFunctionCallIndex,
  ): void {
    this._functionCallIndexFactory.release(id.argumentsId);
  }

  protected override onReleased(): void {
    this.releaseContext();
  }
}

class FunctionCallResultCacheManager extends KeyedInstanceFactory<
  unknown,
  unknown,
  FunctionCallResultCacheForContextManager
> {
  constructor(
    private readonly _functionCallIndexFactory: IFunctionCallIndexFactory,
  ) {
    super();
  }

  public getId(contex: unknown): unknown {
    return this.createId(contex);
  }

  protected createInstance(
    context: unknown,
    id: unknown,
  ): FunctionCallResultCacheForContextManager {
    return new FunctionCallResultCacheForContextManager(
      context,
      this._functionCallIndexFactory,
      () => this.release(id),
    );
  }

  protected createId(contex: unknown): unknown {
    return contex;
  }
}

@Injectable()
export class FunctionCallResultCache implements IFunctionCallResultCache {
  private readonly _functionCallResultCacheManager: FunctionCallResultCacheManager;

  constructor(
    @Inject(RsXCoreInjectionTokens.IFunctionCallIndexFactory)
    functionCallIndexFactory: IFunctionCallIndexFactory,
  ) {
    this._functionCallResultCacheManager = new FunctionCallResultCacheManager(
      functionCallIndexFactory,
    );
  }

  public create(
    context: unknown,
    result: IFunctionCallResult,
  ): IFunctionCallResultCacheEntry {
    return this._functionCallResultCacheManager
      .create(context)
      .instance.create(result).instance;
  }

  public has(context: unknown, index: IDisposableFunctionCallIndex): boolean {
    return (
      this._functionCallResultCacheManager.getFromId(context)?.has(index) ??
      false
    );
  }

  public get(
    context: unknown,
    index: IDisposableFunctionCallIndex,
  ): IFunctionCallResultCacheEntry | undefined {
    return this._functionCallResultCacheManager
      .getFromId(context)
      ?.getFromId(index);
  }
}
