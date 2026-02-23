export interface ISerializedExpressionChangeHistory {
    expressionId: string;
    value: unknown;
    oldValue: unknown;
    isAsync: boolean | undefined;
}