import { IExpression, IExpressionChangeHistory } from '@rs-x/expression-parser';

export interface IExpressionInfo {
    name: string
    version: number;
    isDeleting: boolean;
    editorExpressionString: string;
    expression: IExpression;
    error: string;
    selecteChangeHistoryIndex: number;
    treeHighlightVersion: number
    treeHighlight:  IExpressionChangeHistory[];
    changeHistory: IExpressionChangeHistory[][];
}