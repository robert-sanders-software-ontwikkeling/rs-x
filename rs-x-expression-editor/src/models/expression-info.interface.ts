import {
  type IExpression,
  type IExpressionChangeHistory,
} from '@rs-x/expression-parser';

export interface IExpressionInfo {
  name: string;
  version: number;
  editorExpressionString: string;
  expression: IExpression | undefined;
  error: string;
  selecteChangeHistoryIndex: number;
  treeHighlightVersion: number;
  treeHighlight: IExpressionChangeHistory[];
  changeHistory: IExpressionChangeHistory[][];
}
