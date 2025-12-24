import { Inject, Injectable } from '../dependency-injection';
import { IFunctionCallIndexFactory } from '../function-call-index';
import { IDisposableFunctionCallIndex, IFunctionCallIndex } from '../function-call-index/function-call-index.interface';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';
import { IDisposableOwner } from '../singleton-factory';
import { SingletonFactory } from '../singleton-factory/singleton.factory';
import {
    IFunctionCallResult,
    IFunctionCallResultCache,
    IFunctionCallResultCacheFactory,
    IFunctionCallResultIdInfo,
} from './function-call-result-cache.factory.interface';

class FunctionCallResultCache implements IFunctionCallResultCache {
    private _isDisposed = false;

    constructor(
        private readonly _disposeableIndex: IDisposableFunctionCallIndex,
        public readonly result: unknown,
        private readonly _owner: IDisposableOwner) {
    }

    public get index(): IFunctionCallIndex {
        return this._disposeableIndex;
    }

    public dispose(): void {
        if (this._isDisposed) {
            return;
        }

        if (this._owner.canDispose()) {
            this._disposeableIndex.dispose();
            this._isDisposed = true;
        }

        this._owner.release();
    }
}

class FunctionCallResultCacheForContextManager
    extends SingletonFactory<IFunctionCallIndex, IFunctionCallResult, IFunctionCallResultCache, IFunctionCallResultIdInfo> {

    constructor(
        private readonly _context: unknown,
        private readonly _functionCallIndexFactory: IFunctionCallIndexFactory,
        private readonly releaseContext: () => void) {
        super();
    }

    public override getId(data: IFunctionCallResultIdInfo): IDisposableFunctionCallIndex {
        return this._functionCallIndexFactory.getFromData({
            functionName: data.functionName,
            context: this._context,
            arguments: data.arguments
        });
    }

    protected override createInstance(data: IFunctionCallResult, id: IDisposableFunctionCallIndex): IFunctionCallResultCache {
        return new FunctionCallResultCache(
            id,
            data.result,
            {
                canDispose: () => this.getReferenceCount(id) === 1,
                release: () => this.release(id)
            }
        )
    }

    protected override createId(data: IFunctionCallResultIdInfo): IDisposableFunctionCallIndex {
        return this._functionCallIndexFactory.create({
            functionName: data.functionName,
            context: this._context,
            arguments: data.arguments
        }).instance;

    }

    protected override releaseInstance(_: IFunctionCallResultCache, id: IDisposableFunctionCallIndex): void {
        this._functionCallIndexFactory.release(id.argumentsId);
    }

    protected override onReleased(): void {
        this.releaseContext();
    }
}

class FunctionCallResultCacheManager
    extends SingletonFactory<unknown, unknown, FunctionCallResultCacheForContextManager> {
    constructor(private readonly _functionCallIndexFactory: IFunctionCallIndexFactory) {
        super();
    }

    public getId(contex: unknown): unknown {
        return this.createId(contex);
    }

    protected createInstance(context: unknown, id: unknown): FunctionCallResultCacheForContextManager {
        return new FunctionCallResultCacheForContextManager(context, this._functionCallIndexFactory, () => this.release(id))
    }

    protected createId(contex: unknown): unknown {
        return contex;
    }
}

@Injectable()
export class FunctionCallResultCacheFactory implements IFunctionCallResultCacheFactory {
    private readonly _functionCallResultCacheManager: FunctionCallResultCacheManager

    constructor(
        @Inject(RsXCoreInjectionTokens.IFunctionCallIndexFactory)
        functionCallIndexFactory: IFunctionCallIndexFactory
    ) {
        this._functionCallResultCacheManager = new FunctionCallResultCacheManager(functionCallIndexFactory);
    }

    public create(context: unknown, result: IFunctionCallResult): IFunctionCallResultCache {
        return this._functionCallResultCacheManager.create(context).instance.create(result).instance;
    }

    public has(context: unknown, index: IDisposableFunctionCallIndex): boolean {
        return this._functionCallResultCacheManager.getFromId(context)?.has(index);
    }

    public get(context: unknown, index: IDisposableFunctionCallIndex): IFunctionCallResultCache {
        return this._functionCallResultCacheManager.getFromId(context)?.getFromId(index);
    }
}