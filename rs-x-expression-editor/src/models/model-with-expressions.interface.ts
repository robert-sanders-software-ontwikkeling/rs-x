import type { IExpression, IExpressionChangeHistory } from '@rs-x/expression-parser';



export interface IExpressionInfo {
    name: string
    version: number;
    isDeleting: boolean;
    editorExpressionString: string;
    expression: IExpression;
    selecteChangeHistoryIndex: number;
    treeHighlightVersion: number
    treeHighlight:  IExpressionChangeHistory[];
    changeHistory: IExpressionChangeHistory[][];
}

export interface IModelWithExpressions {
    name: string;
    model: object;
    isDeleting: boolean;
    editorModelString: string;
    selectedExpressionIndex: number | null;
    editingExpressionIndex: number | null;
    expressions: IExpressionInfo[];
}