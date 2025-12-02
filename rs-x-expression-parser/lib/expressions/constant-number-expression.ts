import { IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';
import { ConstantExpression } from './constant-expression';
import { ExpressionType } from './interfaces';

export class ConstantNumberExpression extends ConstantExpression<number> {
   constructor(value: number, expressionChangeTransactionManager: IExpressionChangeTransactionManager) {
      super(ExpressionType.Number, value.toString(), value, expressionChangeTransactionManager);
   }
}
