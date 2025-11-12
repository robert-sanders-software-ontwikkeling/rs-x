export interface IIndexValueAccessor<TContext = unknown, TIndex = unknown> {
   isAsync(context: TContext, index: TIndex): boolean;
   getResolvedValue(context: TContext, index: TIndex): unknown;
   getValue(context: TContext, index: TIndex): unknown;
   setValue(context: TContext, index: TIndex, value: unknown): void;
   applies(context: unknown, index: TIndex): boolean;
}
