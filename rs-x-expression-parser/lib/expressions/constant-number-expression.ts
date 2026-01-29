import { type IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';

import { ConstantExpression } from './constant-expression';
import { ExpressionType } from './expression-parser.interface';

export class ConstantNumberExpression extends ConstantExpression<number> {
   constructor(value: number, expressionChangeTransactionManager: IExpressionChangeTransactionManager) {
      super(ExpressionType.Number, value.toString(), value, expressionChangeTransactionManager);
   }
}
