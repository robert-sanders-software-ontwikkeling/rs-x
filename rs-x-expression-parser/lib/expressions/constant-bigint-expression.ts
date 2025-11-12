import { ConstantExpression } from './constant-expression';
import { ExpressionType } from './interfaces';

export class ConstantBigIntExpression extends ConstantExpression<bigint> {
   constructor(value: bigint) {
      super(ExpressionType.BigInt, value.toString(), value);
   }
}
