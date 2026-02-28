import { type ISerializedExpressionChangeHistory } from './serialized-expression-change-history.interface';

export interface ISerializedExpressionInfo {
  name: string;
  editorExpressionString: string;
  selecteChangeHistoryIndex: number;
  treeHighlight: ISerializedExpressionChangeHistory[];
  changeHistory: ISerializedExpressionChangeHistory[][];
}
