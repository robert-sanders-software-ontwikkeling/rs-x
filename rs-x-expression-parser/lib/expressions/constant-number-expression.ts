import { ConstantExpression } from './constant-expression';
import { ExpressionType } from './expression-parser.interface';

export class ConstantNumberExpression extends ConstantExpression<number> {
  constructor(value: number) {
    super(ExpressionType.Number, value.toString(), value);
  }
}
