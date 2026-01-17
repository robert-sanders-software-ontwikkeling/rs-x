export interface IDeepClone {
   readonly priority: number;
   clone(source: unknown): unknown;
}
