import { IModelWithExpressions } from './model-with-expressions.interface';


export interface IExpressionEditorState  {
    error?: string;
    addingModel?: boolean;
    addingExpression?: boolean;
    modelsWithExpressions:IModelWithExpressions[]
}