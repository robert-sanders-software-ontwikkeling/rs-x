export interface IValueMetadata {
    readonly priority: number;
    isAsync(value: unknown): boolean;
    needsProxy(value: unknown): boolean;
    applies(value: unknown): boolean;
}