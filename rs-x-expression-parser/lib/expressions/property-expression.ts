import { type AbstractExpression } from './abstract-expression';
import { BinaryExpression } from './binary-expression';
import { ExpressionType } from './expression-parser.interface';

export class PropertyExpression extends BinaryExpression<
  object,
  number | string
> {
  constructor(
    expressionString: string,
    keyExpression: AbstractExpression<PropertyKey>,
    valueExpression: AbstractExpression,
  ) {
    super(
      ExpressionType.Property,
      expressionString,
      keyExpression,
      valueExpression,
    );
  }

  protected override evaluateExpression(
    key: PropertyKey,
    value: unknown,
  ): object {
    return { [key]: value };
  }
}
