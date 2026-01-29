import { type ConstructorType } from '@rs-x/core';

import { type AbstractExpression } from './abstract-expression';
import { ExpressionType } from './expression-parser.interface';
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

    public override clone(): this {
      return new (this.constructor as new (
         expressionString: string,
         constructorExpression: AbstractExpression<ConstructorType>,
         argumentExpressions: AbstractExpression[]
      ) => this)(
         this.expressionString,
         this._childExpressions[0].clone() as AbstractExpression<ConstructorType>,
         this._childExpressions.slice(1).map(arg => arg.clone())
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
