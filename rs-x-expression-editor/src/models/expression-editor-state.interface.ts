import { IModelWithExpressions } from './model-with-expressions.interface';


export interface IExpressionEditorState  {
    error?: string;
    addingModel?: boolean;
    addingExpression?: boolean;
    selectedModelIndex?: number;
    treeZoomPercent: number;
    showExpressionTreeView: boolean;
    modelsWithExpressions:IModelWithExpressions[]
}
