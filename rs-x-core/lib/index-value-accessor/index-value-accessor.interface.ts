export interface IIndexValueAccessor<TContext = unknown, TIndex = unknown> {
   readonly priority: number;
   isAsync(context: TContext, index: TIndex): boolean;
   getResolvedValue(context: TContext, index: TIndex): unknown;
   hasValue(context: TContext, index: TIndex): boolean;
   getValue(context: TContext, index: TIndex): unknown;
   setValue(context: TContext, index: TIndex, value: unknown): void;
   getIndexes(context: TContext, index?: TIndex):  IterableIterator<TIndex>;
   applies(context: unknown, index: TIndex): boolean;
}
