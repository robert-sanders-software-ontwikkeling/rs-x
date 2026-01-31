import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionFactory } from '../../lib/expression-factory/expression-factory.interface';
import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import { ExpressionType, type IExpression } from '../../lib/expressions/expression-parser.interface';
import { GreaterThanOrEqualExpression } from '../../lib/expressions/greater-than-or-equal-expression';
import {
   RsXExpressionParserModule,
   unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';


describe('GreaterThanOrEqualExpression tests', () => {
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
      const context = { a: 1, b: 2 };
      expression = expressionFactory.create(context, 'a >= b');
      expect(expression.type).toEqual(ExpressionType.GreaterThanOrEqual);
   });

   it('clone', async () => {
     const services: IExpressionServices = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionServices);
      const context = { a: 1, b: 2 };
      expression = expressionFactory.create(context, 'a >= b');

      const clonedExpression = expression.clone();

      try {
         expect(clonedExpression).toBeInstanceOf(GreaterThanOrEqualExpression);
         expect(clonedExpression.type).toEqual(ExpressionType.GreaterThanOrEqual);
         expect(clonedExpression.expressionString).toEqual('a >= b');

         await new WaitForEvent(clonedExpression, 'changed').wait(() => {
             clonedExpression.bind({
              rootContext: context,
               services
            });

           services.transactionManager.commit();
         });
         expect(clonedExpression.value).toEqual(false);
      } finally {
         clonedExpression.dispose();
      }
   });

   it('will emit change event for initial value: false', async () => {
      const context = { a: 1, b: 2 };
      expression = expressionFactory.create(context, 'a >= b');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(actual.value).toEqual(false);
      expect(actual).toBe(expression);
   });

   it('will emit change event for initial value: true', async () => {
      const context = { a: 2, b: 1 };
      expression = expressionFactory.create(context, 'a >= b');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(actual.value).toEqual(true);
      expect(actual).toBe(expression);
   });

   it('will emit change event for initial value: true (equal)', async () => {
      const context = { a: 1, b: 1 };
      expression = expressionFactory.create(context, 'a >= b');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(actual.value).toEqual(true);
      expect(actual).toBe(expression);
   });

   it('will emit change event when operands changes', async () => {
      const context = {
         a: {
            b: 3,
         },
         c: 2,
      };
      expression = expressionFactory.create(context, 'a.b >= c');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.a.b = 1;
      })) as IExpression;

      expect(actual.value).toEqual(false);
      expect(actual).toBe(expression);
   });
});
