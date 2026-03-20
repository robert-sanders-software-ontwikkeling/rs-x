import { IExpressionFactory } from '../expression-factory/expression-factory.interface';

export class ExpressionFactoryMock implements IExpressionFactory {
    public readonly create = jest.fn();
}