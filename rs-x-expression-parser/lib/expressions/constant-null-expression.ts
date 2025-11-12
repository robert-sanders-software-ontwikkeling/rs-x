import { ConstantExpression } from './constant-expression';
import { ExpressionType } from './interfaces';

export class ConstantNullExpression extends ConstantExpression<null> {
   constructor() {
      super(ExpressionType.Null, 'null', null);
   }
}
