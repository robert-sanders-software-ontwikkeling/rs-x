import { IExpressionInfo } from './expressionI-info.interface';

export interface IModelWithExpressions {
    name: string;
    model: object;
    version: number;
    isDeleting: boolean;
    editorModelString: string;
    selectedExpressionIndex: number;
    expressions: IExpressionInfo[];
}