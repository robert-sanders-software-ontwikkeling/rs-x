import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionChangeTransactionManager } from '../../lib/expresion-change-transaction-manager.interface';
import type { IExpressionFactory } from '../../lib/expression-factory/expression-factory.interface';
import { BitwiseUnsignedRightShiftExpression } from '../../lib/expressions/bitwise-unsigned-right-shift-expression';
import { ExpressionType, type IExpression } from '../../lib/expressions/expression-parser.interface';
import {
   RsXExpressionParserModule,
   unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';


describe('BitwiseUnsignedRightShiftExpression tests', () => {
   let expressionFactory: IExpressionFactory;
   let expression: IExpression | undefined;

   beforeAll(async () => {
      await InjectionContainer.load(RsXExpressionParserModule);
      expressionFactory = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionFactory
      );
   });

   afterAll(async () => {
      await unloadRsXExpressionParserModule();
   });

   afterEach(() => {
      expression?.dispose();
      expression = undefined;
   });

   it('type', () => {
      const context = { a: 5, b: 2 };
      expression = expressionFactory.create(context, 'a >>> b');
      expect(expression.type).toEqual(ExpressionType.BitwiseUnsignedRightShift);
   });

   it('clone', async () => {
      const transactionManager: IExpressionChangeTransactionManager = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager);
      const context = { a: 5, b: 2 };
      expression = expressionFactory.create(context, 'a >>> b');

      const clonedExpression = expression.clone();

      try {
         expect(clonedExpression).toBeInstanceOf(BitwiseUnsignedRightShiftExpression);
         expect(clonedExpression.type).toEqual(ExpressionType.BitwiseUnsignedRightShift);
         expect(clonedExpression.expressionString).toEqual('a >>> b');

         await new WaitForEvent(clonedExpression, 'changed').wait(() => {
            clonedExpression.bind({
               transactionManager,
               rootContext: context
            });

            transactionManager.commit();
         });
         expect(clonedExpression.value).toEqual(1);
      } finally {
         clonedExpression.dispose();
      }
   });

   it('will emit change event for initial value', async () => {
      const context = { a: 5, b: 2 };
      expression = expressionFactory.create(context, 'a >>> b');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(actual.value).toEqual(1);
      expect(actual).toBe(expression);
   });

   it('will emit change event when operands changes', async () => {
      const context = {
         a: {
            b: 5,
         },
         c: 2,
      };
      expression = expressionFactory.create(context, 'a.b >>> c');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });


      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.a.b = -5;
      })) as IExpression;

      expect(actual.value).toEqual(1073741822);
      expect(actual).toBe(expression);
   });
});
