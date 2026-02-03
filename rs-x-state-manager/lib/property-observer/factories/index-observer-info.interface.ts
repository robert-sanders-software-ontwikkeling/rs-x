export interface IIndexObserverIdInfo<TIndex = unknown> {
  index: TIndex;
}
export interface IIndexObserverInfo<
  TIndex = unknown,
> extends IIndexObserverIdInfo<TIndex> {
  initialValue?: unknown;
}
