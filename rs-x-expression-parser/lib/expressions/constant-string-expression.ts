import { ConstantExpression } from './constant-expression';
import { ExpressionType } from './interfaces';

export class ConstantStringExpression extends ConstantExpression<string> {
   constructor(value: string) {
      super(ExpressionType.String, value, value);
   }
}
