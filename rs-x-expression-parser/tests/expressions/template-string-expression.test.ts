import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionChangeTransactionManager } from '../../lib/expresion-change-transaction-manager.interface';
import type { IExpressionFactory } from '../../lib/expression-factory/expression-factory.interface';
import { ExpressionType, type IExpression } from '../../lib/expressions/expression-parser.interface';
import { TemplateStringExpression } from '../../lib/expressions/template-string-expression';
import {
   RsXExpressionParserModule,
   unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';


describe('TemplateStringExpression tests', () => {
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
      const context = { name: 'Robert' };
      expression = expressionFactory.create(context, '`Hello ${name}`');
      expect(expression.type).toEqual(ExpressionType.TemlateString);
   });

   it('clone', async () => {
      const transactionManager: IExpressionChangeTransactionManager = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager);

      const context = { name: 'Robert' };
      expression = expressionFactory.create(context, '`Hello ${name}`');

      const clonedExpression = expression.clone();

      try {
         expect(clonedExpression).toBeInstanceOf(TemplateStringExpression);
         expect(clonedExpression.type).toEqual(ExpressionType.TemlateString);
         expect(clonedExpression.expressionString).toEqual('`Hello ${name}`');

         await new WaitForEvent(clonedExpression, 'changed').wait(() => {
            clonedExpression.bind({
               transactionManager,
               rootContext: context
            });

            transactionManager.commit();
         });
         expect(clonedExpression.value).toEqual('Hello Robert');
      } finally {
         clonedExpression.dispose();
      }
   });

   it('will emit change event for initial value', async () => {
      const context = { name: 'Robert' };
      expression = expressionFactory.create(context, '`Hello ${name}`');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(actual.value).toEqual('Hello Robert');
      expect(actual).toBe(expression);
   });

   it('will emit change event when operands changes', async () => {
      const context = { name: 'Robert' };
      expression = expressionFactory.create(context, '`Hello ${name}`');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.name = 'Pietje';
      })) as IExpression;

      expect(actual.value).toEqual('Hello Pietje');
      expect(actual).toBe(expression);
   });
});
