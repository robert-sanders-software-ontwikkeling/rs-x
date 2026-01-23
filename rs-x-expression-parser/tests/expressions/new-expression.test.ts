import { InjectionContainer, WaitForEvent } from '@rs-x/core';
import {
   ExpressionType,
   type IExpression,
   type IExpressionParser,
} from '../../lib/expressions/interfaces';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';
import {
   RsXExpressionParserModule,
   unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';

describe('NewExpression tests', () => {
   class Test {
      constructor(public readonly value: number) {}
   }
   let jsParser: IExpressionParser;
   let expression: IExpression;

   beforeAll(async () => {
      await InjectionContainer.load(RsXExpressionParserModule);
      jsParser = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionParser
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
      expression = jsParser.parse(context, 'new type(value)');
      expect(expression.type).toEqual(ExpressionType.New);
   });

   it('will emit change event for initial value', async () => {
      const context = {
         type: Test,
         value: 10,
      };
      expression = jsParser.parse(context, 'new type(value)');

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
      expression = jsParser.parse(context, 'new type(value)');
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
