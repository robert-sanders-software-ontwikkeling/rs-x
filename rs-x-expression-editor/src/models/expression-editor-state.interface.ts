import { type IModelWithExpressions } from './model-with-expressions.interface';

export interface IExpressionEditorState {
  errors: string[];
  addingModel: boolean;
  addingExpression: boolean;
  editingModelIndex: number;
  editingExpressionIndex: number;
  deletingExpressionIndex: number;
  deletingModelIndex: number;
  selectedModelIndex: number;
  treeZoomPercent: number;
  showExpressionTreeView: boolean;
  modelsWithExpressions: IModelWithExpressions[];
}

export const NON_EDITITING_STATE = {
  errors: [],
  addingExpression: false,
  addingModel: false,
  editingExpressionIndex: -1,
  editingModelIndex: -1,
  deletingExpressionIndex: -1,
  deletingModelIndex: -1,
};

export function getInitialExpressionEditorState(): IExpressionEditorState {
  return {
    ...NON_EDITITING_STATE,
    selectedModelIndex: -1,
    showExpressionTreeView: false,
    treeZoomPercent: 50,
    modelsWithExpressions: [],
  };
}
