import { ConstructorType } from '@rs-x/core';
import { AbstractExpression } from './abstract-expression';
import { BinaryExpression } from './binary-expression';
import { ExpressionType } from './interfaces';

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
      _: AbstractExpression,
      object: object,
      type: ConstructorType
   ): boolean {
      return object instanceof type;
   }
}
