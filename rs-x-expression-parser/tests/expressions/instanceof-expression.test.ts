import { InjectionContainer, Type, WaitForEvent } from '@rs-x/core';

import type { IExpressionChangeTransactionManager } from '../../lib/expresion-change-transaction-manager.interface';
import type { IExpressionFactory } from '../../lib/expression-factory/expression-factory.interface';
import { ExpressionType, type IExpression } from '../../lib/expressions/expression-parser.interface';
import { InstanceofExpression } from '../../lib/expressions/instanceof-expression';
import {
   RsXExpressionParserModule,
   unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';


describe('InstanceofExpression tests', () => {
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
         type: Date,
         a: new Date(),
      };
      expression = expressionFactory.create(context, 'a instanceof type');
      expect(expression.type).toEqual(ExpressionType.Instanceof);
   });

   it('clone', async () => {
      const transactionManager: IExpressionChangeTransactionManager = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager);

      const context = {
         type: Date,
         a: new Date(),
      };
      expression = expressionFactory.create(context, 'a instanceof type');

      const clonedExpression = expression.clone();

      try {
         expect(clonedExpression).toBeInstanceOf(InstanceofExpression);
         expect(clonedExpression.type).toEqual(ExpressionType.Instanceof);
         expect(clonedExpression.expressionString).toEqual('a instanceof type');

         await new WaitForEvent(clonedExpression, 'changed').wait(() => {
            clonedExpression.bind({
               transactionManager,
               rootContext: context
            });

            transactionManager.commit();
         });
         expect(clonedExpression.value).toEqual(true);
      } finally {
         clonedExpression.dispose();
      }
   });

   it('will emit change event for initial value: true', async () => {
      const context = {
         type: Date,
         a: new Date(),
      };
      expression = expressionFactory.create(context, 'a instanceof type');
      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(actual.value).toEqual(true);
      expect(actual).toBe(expression);
   });

   it('will emit change event for initial value: true', async () => {
      const context = {
         type: String,
         a: new Date(),
      };
      expression = expressionFactory.create(context, 'a instanceof type');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(actual.value).toEqual(false);
      expect(actual).toBe(expression);
   });

   it('will emit change event when parameters changes', async () => {
      const context = {
         type: String.constructor,
         a: new Date(),
      };
      expression = expressionFactory.create(context, 'a instanceof type');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.type = Type.cast(Date);
      })) as IExpression;

      expect(actual.value).toEqual(true);
      expect(actual).toBe(expression);
   });
});
