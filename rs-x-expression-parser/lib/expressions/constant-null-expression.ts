import { IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';
import { ConstantExpression } from './constant-expression';
import { ExpressionType } from './interfaces';

export class ConstantNullExpression extends ConstantExpression<null> {
   constructor(expressionChangeTransactionManager: IExpressionChangeTransactionManager) {
      super(ExpressionType.Null, 'null', null, expressionChangeTransactionManager);
   }
}
