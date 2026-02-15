import { IExpression } from '@rs-x/expression-parser';

export interface IModelWithExpressions {
    name: string;
    model: object;
    modelString: string;
    selectedExpressionIndex: number | null;
    editingExpressionIndex: number | null;
    expressions: IExpression[];
}