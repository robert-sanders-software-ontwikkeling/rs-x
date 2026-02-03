import { ConstantExpression } from './constant-expression';
import { ExpressionType } from './expression-parser.interface';

export class ConstantBigIntExpression extends ConstantExpression<bigint> {
  constructor(value: bigint) {
    super(ExpressionType.BigInt, value.toString(), value);
  }
}
