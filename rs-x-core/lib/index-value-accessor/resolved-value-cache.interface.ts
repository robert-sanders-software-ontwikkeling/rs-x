export interface IResolvedValueCache {
  set(source: WeakKey, value: unknown): void;
  get(source: WeakKey): unknown;
  delete(source: WeakKey): void;
}
