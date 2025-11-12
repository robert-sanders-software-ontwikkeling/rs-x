import { ConstantExpression } from './constant-expression';
import { ExpressionType } from './interfaces';

export class ConstantBooleanExpression extends ConstantExpression<boolean> {
   constructor(value: boolean) {
      super(ExpressionType.Boolean, value.toString(), value);
   }
}
