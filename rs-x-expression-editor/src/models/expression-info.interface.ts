import {
  type IExpressionChangeHistory,
  type IExpressionTree,
} from '@rs-x/expression-parser';

export interface IExpressionInfo {
  name: string;
  version: number;
  editorExpressionString: string;
  expression: IExpressionTree | undefined;
  error: string;
  selecteChangeHistoryIndex: number;
  treeHighlightVersion: number;
  treeHighlight: IExpressionChangeHistory[];
  changeHistory: IExpressionChangeHistory[][];
}
