import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionFactory } from '../../lib/expression-factory/expression-factory.interface';
import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import { ExpressionType, type IExpression } from '../../lib/expressions/expression-parser.interface';
import { LogicalAndExpression } from '../../lib/expressions/logical-and-expression';
import {
   RsXExpressionParserModule,
   unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';


describe('LogicalAndExpression tests', () => {
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
      const context = { a: true, b: true };
      expression = expressionFactory.create(context, 'a && b');
      expect(expression.type).toEqual(ExpressionType.And);
   });

   it('clone', async () => {
     const services: IExpressionServices = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionServices);
      const context = { a: true, b: true };
      expression = expressionFactory.create(context, 'a && b');

      const clonedExpression = expression.clone();

      try {
         expect(clonedExpression).toBeInstanceOf(LogicalAndExpression);
         expect(clonedExpression.type).toEqual(ExpressionType.And);
         expect(clonedExpression.expressionString).toEqual('a && b');

         await new WaitForEvent(clonedExpression, 'changed').wait(() => {
             clonedExpression.bind({
              rootContext: context,
               services
            });

           services.transactionManager.commit();
         });
         expect(clonedExpression.value).toEqual(true);
      } finally {
         clonedExpression.dispose();
      }
   });

   it('will emit change event for initial value', async () => {
      const context = { a: true, b: true };
      expression = expressionFactory.create(context, 'a && b');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(actual.value).toEqual(true);
      expect(actual).toBe(expression);
   });

   it('will emit change event when operands changes', async () => {
      const context = {
         a: {
            b: true,
         },
         c: true,
      };
      expression = expressionFactory.create(context, 'a.b && c');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.a.b = false;
      })) as IExpression;

      expect(actual.value).toEqual(false);
      expect(actual).toBe(expression);
   });
});
