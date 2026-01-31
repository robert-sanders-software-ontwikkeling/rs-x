import { ConstantExpression } from './constant-expression';
import { ExpressionType } from './expression-parser.interface';

export class ConstantNullExpression extends ConstantExpression<null> {
   constructor() {
      super(ExpressionType.Null, 'null', null);
   }

   override clone(): this {
      return new (this.constructor as new () => this)();
   }
}
