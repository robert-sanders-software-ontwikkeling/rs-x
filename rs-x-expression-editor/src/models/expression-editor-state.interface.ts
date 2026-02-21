import { IModelWithExpressions } from './model-with-expressions.interface';


export interface IExpressionEditorState  {
    error?: string;
    addingModel: boolean;
    addingExpression: boolean;
    editingModelIndex: number;
    editingExpressionIndex: number;
    selectedModelIndex: number;
    treeZoomPercent: number;
    showExpressionTreeView: boolean;
    modelsWithExpressions:IModelWithExpressions[]
}
