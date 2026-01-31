import { ConstantExpression } from './constant-expression';
import { ExpressionType } from './expression-parser.interface';

export class ConstantBooleanExpression extends ConstantExpression<boolean> {
   constructor(value: boolean) {
      super(ExpressionType.Boolean, value.toString(), value);
   }
}
