import { ConstantExpression } from './constant-expression';
import { ExpressionType } from './interfaces';

export class ConstantNumberExpression extends ConstantExpression<number> {
   constructor(value: number) {
      super(ExpressionType.Number, value.toString(), value);
   }
}
