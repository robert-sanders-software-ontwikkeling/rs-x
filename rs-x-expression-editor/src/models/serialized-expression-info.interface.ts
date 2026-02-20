import { ISerializedExpressionChangeHistory } from './serialized-expression-change-history.interface';

export interface ISerializedExpressionInfo {
    name: string;
    editorExpressionString: string;
    isDeleting: boolean;
    selecteChangeHistoryIndex: number;
    treeHighlight: ISerializedExpressionChangeHistory[];
    changeHistory: ISerializedExpressionChangeHistory[][];
}
