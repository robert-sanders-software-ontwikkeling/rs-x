import { type IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';

import { ConstantExpression } from './constant-expression';
import { ExpressionType } from './expression-parser.interface';

export class ConstantRegExpExpression extends ConstantExpression<RegExp> {
   constructor(expressionString: string, value: RegExp, expressionChangeTransactionManager: IExpressionChangeTransactionManager) {
      super(ExpressionType.RegExp, expressionString, value, expressionChangeTransactionManager);
   }
}
