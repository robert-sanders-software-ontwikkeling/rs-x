import { type ConstructorType } from '@rs-x/core';
import { type AbstractExpression } from './abstract-expression';
import { ExpressionType } from './interfaces';
import { ParameterizedExpression } from './parameterized-abstract-expression';

export class NewExpression extends ParameterizedExpression {
   constructor(
      expressionString: string,
      constructorExpression: AbstractExpression<ConstructorType>,
      argumentExpressions: AbstractExpression[]
   ) {
      super(
         ExpressionType.New,
         expressionString,
         constructorExpression,
         ...(argumentExpressions ?? [])
      );
   }

   protected evaluateExpression(
      constructorFunction: ConstructorType,
      ...args: unknown[]
   ): unknown {
      if (!constructorFunction) {
         return null;
      }
      return new constructorFunction(...args);
   }
}
