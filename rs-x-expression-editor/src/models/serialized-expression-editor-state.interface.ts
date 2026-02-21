import { ISerializedModelWithExpressions } from './serialized-model-with-expressions.interface';

export interface ISerializedExpressionEditorState {
    error?: string;
    treeZoomPercent: number;
    showExpressionTreeView: boolean;
    addingModel: boolean;
    addingExpression: boolean;
    selectedModelIndex: number;
    editingExpressionIndex: number;
    editingModelIndex: number;
    modelsWithExpressions: ISerializedModelWithExpressions[];
}