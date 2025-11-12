import { AbstractExpression } from './abstract-expression';
import { ExpressionType } from './interfaces';
import { ParameterizedExpression } from './parameterized-abstract-expression';

export abstract class CollectionExpression<
   T = unknown,
> extends ParameterizedExpression<T> {
   constructor(
      type: ExpressionType,
      expressionString: string,
      expressions: AbstractExpression[]
   ) {
      super(type, expressionString, ...expressions);
   }
}
