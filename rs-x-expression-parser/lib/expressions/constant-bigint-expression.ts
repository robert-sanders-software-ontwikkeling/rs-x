import { IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';
import { ConstantExpression } from './constant-expression';
import { ExpressionType } from './interfaces';

export class ConstantBigIntExpression extends ConstantExpression<bigint> {
   constructor(value: bigint, expressionChangeTransactionManager: IExpressionChangeTransactionManager) {
      super(ExpressionType.BigInt, value.toString(), value, expressionChangeTransactionManager);
   }
}
