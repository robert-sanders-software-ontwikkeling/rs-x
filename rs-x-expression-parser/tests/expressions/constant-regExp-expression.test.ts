import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionChangeTransactionManager } from '../../lib/expresion-change-transaction-manager.interface';
import type { IExpressionFactory } from '../../lib/expression-factory/expression-factory.interface';
import { ConstantRegExpExpression } from '../../lib/expressions/constant-regexp-expression';
import { ExpressionType, type IExpression } from '../../lib/expressions/expression-parser.interface';
import {
   RsXExpressionParserModule,
   unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';

describe('ConstantRegExpExpression tests', () => {
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
      expression = expressionFactory.create({}, '/ab+c/i');
      expect(expression.type).toEqual(ExpressionType.RegExp);
   });

   it('clone', async () => {
      const transactionManager: IExpressionChangeTransactionManager = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager);

      expression = expressionFactory.create({}, '/ab+c/i');

      const clonedExpression = expression.clone();

      try {
         expect(clonedExpression).toBeInstanceOf(ConstantRegExpExpression);
         expect(clonedExpression.type).toEqual(ExpressionType.RegExp);
         expect(clonedExpression.expressionString).toEqual('/ab+c/i');

         await new WaitForEvent(clonedExpression, 'changed').wait(() => {
            clonedExpression.bind({
               transactionManager,
               rootContext: {}
            });

            transactionManager.commit();
         });
         expect(clonedExpression.value).toEqual(new RegExp('ab+c', 'i'));
      } finally {
         clonedExpression.dispose();
      }
   });

   it('will emit change event for initial value', async () => {
      expression = expressionFactory.create({}, '/ab+c/i');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(actual.value).toEqual(new RegExp('ab+c', 'i'));
      expect(actual).toBe(expression);
   });
});
