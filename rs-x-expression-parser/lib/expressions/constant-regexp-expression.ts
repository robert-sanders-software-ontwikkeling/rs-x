import { type IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';

import { ConstantExpression } from './constant-expression';
import { ExpressionType } from './expression-parser.interface';

export class ConstantRegExpExpression extends ConstantExpression<RegExp> {
   constructor(expressionString: string, value: RegExp, expressionChangeTransactionManager: IExpressionChangeTransactionManager) {
      super(ExpressionType.RegExp, expressionString, value, expressionChangeTransactionManager);
   }

   override clone(): this {
      return new (this.constructor as new (
         expressionString: string,
         value: RegExp,
         expressionChangeTransactionManager: IExpressionChangeTransactionManager
      ) => this)(
         this.expressionString,
         this._value as RegExp,
         this._expressionChangeTransactionManager
      );
   }
}
