import { IModelWithExpressions } from './model-with-expressions.interface';


export interface IExpressionEditorState {
    error?: string;
    addingModel: boolean;
    addingExpression: boolean;
    editingModelIndex: number;
    editingExpressionIndex: number;
    selectedModelIndex: number;
    treeZoomPercent: number;
    showExpressionTreeView: boolean;
    modelsWithExpressions: IModelWithExpressions[]
}

export const NON_EDITITING_STATE = {
    error: undefined,
    addingExpression: false,
    addingModel: false,
    editingExpressionIndex: -1,
    editingModelIndex: -1,
}


export function getInitialExpressionEditorState(): IExpressionEditorState {
    return {
        ...NON_EDITITING_STATE,
        selectedModelIndex: -1,
        showExpressionTreeView: false,
        treeZoomPercent: 75,
        modelsWithExpressions: [],
    };

}
