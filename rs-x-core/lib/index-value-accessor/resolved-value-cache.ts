import { Injectable } from '../dependency-injection';
import { IResolvedValueCache } from './resolved-value-cache.interface';


@Injectable()
export class ResolvedValueCache implements IResolvedValueCache {
    private readonly _resolvedValues = new WeakMap<WeakKey, unknown>();


    public set(source: WeakKey, value: unknown) {
        this._resolvedValues.set(source, value)
    }

    public get(source: WeakKey): unknown {
        return this._resolvedValues.get(source);
    }

    public  delete(source: WeakKey): void {
        this._resolvedValues.delete(source);
    }
}