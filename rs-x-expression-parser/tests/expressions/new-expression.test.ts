import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionFactory } from '../../lib/expression-factory/expression-factory.interface';
import { ExpressionType, type IExpression } from '../../lib/expressions/expression-parser.interface';
import {
   RsXExpressionParserModule,
   unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';

describe('NewExpression tests', () => {
   class Test {
      constructor(public readonly value: number) {}
   }
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
         type: Test,
         value: 10,
      };
      expression = expressionFactory.create(context, 'new type(value)');
      expect(expression.type).toEqual(ExpressionType.New);
   });

   it('will emit change event for initial value', async () => {
      const context = {
         type: Test,
         value: 10,
      };
      expression = expressionFactory.create(context, 'new type(value)');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(new Test(10));
      expect(actual).toBe(expression);
   });

   it('will emit change event when parameters changes', async () => {
      const context = {
         type: Test,
         value: 10,
      };
      expression = expressionFactory.create(context, 'new type(value)');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.value = 20;
      })) as IExpression;

      expect(actual.value).toEqual(new Test(20));
      expect(actual).toBe(expression);
   });
});
