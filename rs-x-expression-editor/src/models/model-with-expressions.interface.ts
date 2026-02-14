import { IExpression } from '@rs-x/expression-parser';

export interface IModelWithExpressions {
    name: string;
    model: object;
    modelString: string;
    selected?: boolean;
    selectedExpressionIndex: number | null;
    editingExpressionIndex: number | null;
    expressions: IExpression[];
}