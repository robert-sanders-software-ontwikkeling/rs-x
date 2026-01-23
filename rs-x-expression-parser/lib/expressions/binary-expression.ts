import { type AbstractExpression } from './abstract-expression';
import { type ExpressionType } from './interfaces';
import { ParameterizedExpression } from './parameterized-abstract-expression';

export abstract class BinaryExpression<
   T = unknown,
   PT = unknown,
> extends ParameterizedExpression<T, PT> {
   protected constructor(
      expressionType: ExpressionType,
      expressionString: string,
      leftExpression: AbstractExpression,
      rightExpression: AbstractExpression
   ) {
      super(expressionType, expressionString, leftExpression, rightExpression);
   }
}
