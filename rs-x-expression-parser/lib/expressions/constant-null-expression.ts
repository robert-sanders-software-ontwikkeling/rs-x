import { type IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';

import { ConstantExpression } from './constant-expression';
import { ExpressionType } from './expression-parser.interface';

export class ConstantNullExpression extends ConstantExpression<null> {
   constructor(expressionChangeTransactionManager: IExpressionChangeTransactionManager) {
      super(ExpressionType.Null, 'null', null, expressionChangeTransactionManager);
   }

   override clone(): this {
      return new (this.constructor as new (
         expressionChangeTransactionManager: IExpressionChangeTransactionManager
      ) => this)(
         this._expressionChangeTransactionManager
      );
   }
}
