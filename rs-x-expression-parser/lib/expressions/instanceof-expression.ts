import { type ConstructorType } from '@rs-x/core';

import { type AbstractExpression } from './abstract-expression';
import { BinaryExpression } from './binary-expression';
import { ExpressionType } from './expression-parser.interface';

export class InstanceofExpression extends BinaryExpression<
   boolean,
   ConstructorType
> {
   constructor(
      expressionString: string,
      leftExpression: AbstractExpression,
      rightExpression: AbstractExpression<ConstructorType>
   ) {
      super(
         ExpressionType.Instanceof,
         expressionString,
         leftExpression,
         rightExpression
      );
   }

   protected override evaluateExpression(
      object: object,
      type: ConstructorType
   ): boolean {
      return object instanceof type;
   }
}
