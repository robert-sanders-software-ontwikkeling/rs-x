import { type ISerializedModelWithExpressions } from './serialized-model-with-expressions.interface';

export interface ISerializedExpressionEditorState {
  errors: string[];
  treeZoomPercent: number;
  showExpressionTreeView: boolean;
  addingModel: boolean;
  addingExpression: boolean;
  selectedModelIndex: number;
  editingExpressionIndex: number;
  editingModelIndex: number;
  deletingExpressionIndex: number;
  deletingModelIndex: number;
  modelsWithExpressions: ISerializedModelWithExpressions[];
}
