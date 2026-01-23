import { type IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';
import { ConstantExpression } from './constant-expression';
import { ExpressionType } from './interfaces';

export class ConstantStringExpression extends ConstantExpression<string> {
   constructor(value: string, expressionChangeTransactionManager: IExpressionChangeTransactionManager) {
      super(ExpressionType.String, value, value, expressionChangeTransactionManager);
   }
}
