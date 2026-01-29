import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionFactory } from '../../lib/expression-factory/expression-factory.interface';
import { ExpressionType, type IExpression } from '../../lib/expressions/expression-parser.interface';
import {
   RsXExpressionParserModule,
   unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';

describe('UnaryPlusExpression tests', () => {
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
      const context = { a: '2' };
      expression = expressionFactory.create(context, '+a');
      expect(expression.type).toEqual(ExpressionType.UnaryPlus);
   });

   it('will emit change event for initial value', async () => {
      const context = { a: '2' };
      expression = expressionFactory.create(context, '+a');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(2);
      expect(actual).toBe(expression);
   });

   it('will emit change event when operands changes', async () => {
      const context = { a: '2' };
      expression = expressionFactory.create(context, '+a');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.a = '3';
      })) as IExpression;

      expect(actual.value).toEqual(3);
      expect(actual).toBe(expression);
   });
});
