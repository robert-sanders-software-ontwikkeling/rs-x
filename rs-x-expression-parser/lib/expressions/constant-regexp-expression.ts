import { ConstantExpression } from './constant-expression';
import { ExpressionType } from './interfaces';

export class ConstantRegExpExpression extends ConstantExpression<RegExp> {
   constructor(expressionString: string, value: RegExp) {
      super(ExpressionType.RegExp, expressionString, value);
   }
}
