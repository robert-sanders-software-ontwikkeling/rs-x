import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionFactory } from '../../lib/expression-factory/expression-factory.interface';
import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import { ExpressionType, type IExpression } from '../../lib/expressions/expression-parser.interface';
import { InExpression } from '../../lib/expressions/in-expression';
import {
   RsXExpressionParserModule,
   unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';


describe('InExpression tests', () => {
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
         b: {
            hello: 'hi',
         },
      };
      expression = expressionFactory.create(context, '"hello" in b');
      expect(expression.type).toEqual(ExpressionType.In);
   });

   it('clone', async () => {
     const services: IExpressionServices = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionServices);
      const context = {
         b: {
            hello: 'hi',
         },
      };
      expression = expressionFactory.create(context, '"hello" in b');

      const clonedExpression = expression.clone();

      try {
         expect(clonedExpression).toBeInstanceOf(InExpression);
         expect(clonedExpression.type).toEqual(ExpressionType.In);
         expect(clonedExpression.expressionString).toEqual('("hello" in b)');

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

   it('will emit change event for initial value: true', async () => {
      const context = {
         b: {
            hello: 'hi',
         },
      };
      expression = expressionFactory.create(context, ' "hello" in b');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(actual.value).toEqual(true);
      expect(actual).toBe(expression);
   });

   it('will emit change event for initial value: false', async () => {
      const context = {
         b: {
            hello: 'hi',
         },
      };
      expression = expressionFactory.create(context, ' "x" in b');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(actual.value).toEqual(false);
      expect(actual).toBe(expression);
   });

   it('will emit change event when argument changes', async () => {
      const context = {
         propertyName: 'hello',
         b: {
            hello: 'hi',
         },
      };
      expression = expressionFactory.create(context, ' propertyName in b');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.propertyName = 'x';
      })) as IExpression;

      expect(actual.value).toEqual(false);
      expect(actual).toBe(expression);
   });
});
