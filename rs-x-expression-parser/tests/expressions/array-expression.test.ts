import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import { ArrayExpression } from '../../lib';
import type { IExpressionChangeTransactionManager } from '../../lib/expresion-change-transaction-manager.interface';
import type { IExpressionFactory } from '../../lib/expression-factory/expression-factory.interface';
import { ExpressionType, type IExpression } from '../../lib/expressions/expression-parser.interface';
import {
   RsXExpressionParserModule,
   unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';

describe('Array expression tests', () => {
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
      expression = expressionFactory.create({}, '[1,2]');
      expect(expression.type).toEqual(ExpressionType.Array);
   });


   it('clone', async () => {
      const transactionManager: IExpressionChangeTransactionManager = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager);
      const context = { array: [2, 3] };
      expression = expressionFactory.create(context, '[1, 2]');

      const clonedExpression = expression.clone();

      try {
         expect(clonedExpression).toBeInstanceOf(ArrayExpression);
         expect(clonedExpression.type).toEqual(ExpressionType.Array);
         expect(clonedExpression.expressionString).toEqual('[1, 2]');

         await new WaitForEvent(clonedExpression, 'changed').wait(() => {
            clonedExpression.bind({
               transactionManager,
               rootContext: context
            });

            transactionManager.commit();
         });
         expect(clonedExpression.value).toEqual([1, 2]);
      } finally {
         clonedExpression.dispose();
      }
   });

   it('will emit change event for initial value: [1, 2]', async () => {
      expression = expressionFactory.create({}, '[1, 2]');
      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(expression.value).toEqual([1, 2]);
      expect(actual).toBe(expression);
   });

   it('will emit change event for initial value: [1, ...[2, 3]]', async () => {
      expression = expressionFactory.create({}, ' [1, ...[2, 3]]');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(expression.value).toEqual([1, 2, 3]);
      expect(actual).toBe(expression);
   });

   it('will emit change event when one of the identifiers in array expression changes', async () => {
      const context = {
         array: [2, 3],
      };
      expression = expressionFactory.create(context, ' [1, ...array]');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });


      const actual = (await new WaitForEvent(expression, 'changed').wait(() => {
         context.array.push(4);
      })) as IExpression;

      expect(expression.value).toEqual([1, 2, 3, 4]);
      expect(actual).toBe(expression);
   });
});
