import { IIdentifierExpression } from '../expressions';
import { ExpressionMock } from './expression.mock';

export class IdentifierExpressionMock extends ExpressionMock implements IIdentifierExpression {
    public readonly setValue = jest.fn();
    
}