import type { IExpression, IExpressionChangeHistory } from '@rs-x/expression-parser';



export interface IExpressionInfo {
    name: string
    version: number;
    expression: IExpression;
    selecteChangeHistoryIndex: number;
    changeHistory: IExpressionChangeHistory[][];
}

export interface IModelWithExpressions {
    name: string;
    model: object;
    modelString: string;
    selectedExpressionIndex: number | null;
    editingExpressionIndex: number | null;
    expressions: IExpressionInfo[];
}