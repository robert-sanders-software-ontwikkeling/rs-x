import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionChangeTransactionManager } from '../../lib/expresion-change-transaction-manager.interface';
import type { IExpressionFactory } from '../../lib/expression-factory/expression-factory.interface';
import { ExpressionType, type IExpression } from '../../lib/expressions/expression-parser.interface';
import { TypeofExpression } from '../../lib/expressions/typeof-expression';
import {
   RsXExpressionParserModule,
   unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';

describe('TypeofExpression tests', () => {
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
      const context = {
         index: 0,
         a: ['1', 1],
      };
      expression = expressionFactory.create(context, 'typeof a[index]');
      expect(expression.type).toEqual(ExpressionType.Typeof);
   });

   it('clone', async () => {
      const transactionManager: IExpressionChangeTransactionManager = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager);

      const context = {
         index: 0,
         a: ['1', 1],
      };
      expression = expressionFactory.create(context, 'typeof a[index]');

      const clonedExpression = expression.clone();

      try {
         expect(clonedExpression).toBeInstanceOf(TypeofExpression);
         expect(clonedExpression.type).toEqual(ExpressionType.Typeof);
         expect(clonedExpression.expressionString).toEqual('typeof a[index]');

         await new WaitForEvent(clonedExpression, 'changed').wait(() => {
            clonedExpression.bind({
               transactionManager,
               rootContext: context
            });

            transactionManager.commit();
         });
         expect(clonedExpression.value).toEqual('string');
      } finally {
         clonedExpression.dispose();
      }
   });

   it('will emit change event for initial value', async () => {
      const context = {
         index: 0,
         a: ['1', 1],
      };
      expression = expressionFactory.create(context, 'typeof a[index]');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(actual.value).toEqual('string');
      expect(actual).toBe(expression);
   });

   it('will emit change event when operands changes', async () => {
      const context = {
         index: 0,
         a: ['1', 1],
      };
      expression = expressionFactory.create(context, 'typeof a[index]');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });

      const actual = (await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
         context.index = 1;
      })) as IExpression;

      expect(actual.value).toEqual('number');
      expect(actual).toBe(expression);
   });
});
