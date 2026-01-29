import { type IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';

import { ConstantExpression } from './constant-expression';
import { ExpressionType } from './expression-parser.interface';

export class ConstantBooleanExpression extends ConstantExpression<boolean> {
   constructor(value: boolean, expressionChangeTransactionManager: IExpressionChangeTransactionManager) {
      super(ExpressionType.Boolean, value.toString(), value, expressionChangeTransactionManager);
   }
}
