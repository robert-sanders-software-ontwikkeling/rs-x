import { ConstantExpression } from './constant-expression';
import { ExpressionType } from './expression-parser.interface';

export class ConstantStringExpression extends ConstantExpression<string> {
   constructor(value: string) {
      super(ExpressionType.String, value, value);
   }
}
