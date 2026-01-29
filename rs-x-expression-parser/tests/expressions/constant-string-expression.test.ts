import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionChangeTransactionManager } from '../../lib/expresion-change-transaction-manager.interface';
import type { IExpressionFactory } from '../../lib/expression-factory/expression-factory.interface';
import { ConstantStringExpression } from '../../lib/expressions/constant-string-expression';
import { ExpressionType, type IExpression } from '../../lib/expressions/expression-parser.interface';
import {
   RsXExpressionParserModule,
   unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';


describe('ConstantStringExpression tests', () => {
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
      expression = expressionFactory.create({}, '"hi"');
      expect(expression.type).toEqual(ExpressionType.String);
   });

   it('clone', async () => {
      const transactionManager: IExpressionChangeTransactionManager = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager);

      expression = expressionFactory.create({}, '`hi`');

      const clonedExpression = expression.clone();

      try {
         expect(clonedExpression).toBeInstanceOf(ConstantStringExpression);
         expect(clonedExpression.type).toEqual(ExpressionType.String);
         expect(clonedExpression.expressionString).toEqual('hi');

         await new WaitForEvent(clonedExpression, 'changed').wait(() => {
            clonedExpression.bind({
               transactionManager,
               rootContext: {}
            });

            transactionManager.commit();
         });
         expect(clonedExpression.value).toEqual('hi');
      } finally {
         clonedExpression.dispose();
      }
   });

   it('type: backtick', () => {
      expression = expressionFactory.create({}, '`hi`');
      expect(expression.type).toEqual(ExpressionType.String);
   });

   it('will emit change event for initial value: double quotes', async () => {
      expression = expressionFactory.create({}, '"hi"');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(actual.value).toEqual('hi');
      expect(actual).toBe(expression);
   });

   it('will emit change event for initial value: single quotes', async () => {
      expression = expressionFactory.create({}, "'hi'");

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(actual.value).toEqual('hi');
      expect(actual).toBe(expression);
   });

   it('will emit change event for initial value: backtick', async () => {
      expression = expressionFactory.create({}, '`hi`');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(actual.value).toEqual('hi');
      expect(actual).toBe(expression);
   });
});
