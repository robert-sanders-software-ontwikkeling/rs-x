import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionFactory } from '../../lib/expression-factory/expression-factory.interface';
import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import { ConditionalExpression } from '../../lib/expressions/conditional-expression';
import { ExpressionType, type IExpression } from '../../lib/expressions/expression-parser.interface';
import {
   RsXExpressionParserModule,
   unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';


describe('ConditionalExpression tests', () => {
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
      const context = { a: 1, b: 2, c: 100, d: 200 };
      expression = expressionFactory.create(context, 'a > b ? c : d');
      expect(expression.type).toEqual(ExpressionType.Conditional);
   });

   it('clone', async () => {
     const services: IExpressionServices = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionServices);      const context = { a: 10, b: 2, c: 100, d: 200 };
      expression = expressionFactory.create(context, 'a > b ? c : d');

      const clonedExpression = expression.clone();

      try {
         expect(clonedExpression).toBeInstanceOf(ConditionalExpression);
         expect(clonedExpression.type).toEqual(ExpressionType.Conditional);
         expect(clonedExpression.expressionString).toEqual('a > b ? c : d');

         await new WaitForEvent(clonedExpression, 'changed').wait(() => {
             clonedExpression.bind({
              rootContext: context,
               services
            });

           services.transactionManager.commit();
         });
         expect(clonedExpression.value).toEqual(100);
      } finally {
         clonedExpression.dispose();
      }
   });

   it('will return consequent if condition is true', async () => {
      const context = { a: 10, b: 2, c: 100, d: 200 };
      expression = expressionFactory.create(context, 'a > b ? c : d');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(actual.value).toEqual(100);
      expect(actual).toBe(expression);
   });

   it('will return alternate if condition is false', async () => {
      const context = { a: 1, b: 2, c: 100, d: 200 };
      expression = expressionFactory.create(context, 'a > b ? c : d');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(actual.value).toEqual(200);
      expect(actual).toBe(expression);
   });

   it('will return emit change event when condition changes', async () => {
      const context = { a: 1, b: 2, c: 100, d: 200 };
      expression = expressionFactory.create(context, 'a > b ? c : d');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });


      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.a = 3;
      })) as IExpression;

      expect(actual.value).toEqual(100);
      expect(actual).toBe(expression);
   });

   it('will emit change event if consequent changes', async () => {
      const context = { a: 10, b: 2, c: 100, d: 200 };
      expression = expressionFactory.create(context, 'a > b ? c : d');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });


      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.c = 400;
      })) as IExpression;

      expect(actual.value).toEqual(400);
      expect(actual).toBe(expression);
   });

   it('will not emit change event if condition is true and changing alternate', async () => {
      const context = { a: 10, b: 2, c: 100, d: 200 };
      expression = expressionFactory.create(context, 'a > b ? c : d');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });


      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.d = 400;
      })) as IExpression;

      expect(actual).toBeNull();
   });

   it('will emit change event if alternate changes', async () => {
      const context = { a: 1, b: 2, c: 100, d: 200 };
      expression = expressionFactory.create(context, 'a > b ? c : d');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });


      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.d = 400;
      })) as IExpression;

      expect(actual.value).toEqual(400);
      expect(actual).toBe(expression);
   });

   it('will not emit change event if condition is false and changing consequent', async () => {
      const context = { a: 1, b: 2, c: 100, d: 200 };
      expression = expressionFactory.create(context, 'a > b ? c : d');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });


      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.c = 400;
      })) as IExpression;

      expect(actual).toBeNull();
   });
});
