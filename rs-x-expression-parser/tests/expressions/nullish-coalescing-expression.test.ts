import { InjectionContainer, WaitForEvent } from '@rs-x/core';
import {
   ExpressionType,
   IExpression,
   IExpressionParser,
} from '../../lib/expressions/interfaces';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';
import {
   RsXExpressionParserModule,
   unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';

describe('NullishCoalescingExpression tests', () => {
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
         a: null,
         b: 10,
      };
      expression = jsParser.parse(context, 'a ?? b');
      expect(expression.type).toEqual(ExpressionType.NullishCoalescing);
   });

   it('will emit change event for initial value', async () => {
      const context = {
         a: null,
         b: 10,
      };
      expression = jsParser.parse(context, 'a ?? b');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(10);
      expect(actual).toBe(expression);
   });

   it('will emit change event when parameters changes', async () => {
      const context = {
         a: null,
         b: 10,
      };
      expression = jsParser.parse(context, 'a ?? b');

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.a = 20;
      })) as IExpression;

      expect(actual.value).toEqual(20);
      expect(actual).toBe(expression);
   });
});
