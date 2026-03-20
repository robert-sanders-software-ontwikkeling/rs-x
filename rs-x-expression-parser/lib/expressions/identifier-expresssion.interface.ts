import { IExpression } from './expression-parser.interface';

export interface IIdentifierExpression extends IExpression {
  setValue(value: unknown): void;
}