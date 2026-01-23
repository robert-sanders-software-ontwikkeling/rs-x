import { type IResolvedValueCache } from '../index-value-accessor/resolved-value-cache.interface';

export class ResolvedValueCacheMock implements IResolvedValueCache {
    public readonly  set = jest.fn();
    public readonly get= jest.fn();
    public readonly  delete= jest.fn();

}