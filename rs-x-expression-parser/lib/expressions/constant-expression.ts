import { AbstractExpression } from './abstract-expression';
import { ExpressionType } from './interfaces';

export class ConstantExpression<T> extends AbstractExpression<T> {
   constructor(
      type: ExpressionType,
      expressionString: string,
      private readonly _constantValue: T
   ) {
      super(type, expressionString);
   }

   public override initialize(): AbstractExpression {
      this.evaluate(this, null);
      return this;
   }

   protected override evaluateExpression(): T {
      return this._constantValue;
   }
}
