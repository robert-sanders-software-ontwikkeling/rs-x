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

describe('LessThanOrEqualExpression tests', () => {
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
      const context = { a: 1, b: 2 };
      expression = jsParser.parse(context, 'a <= b');
      expect(expression.type).toEqual(ExpressionType.LessThanOrEqual);
   });

   it('will emit change event for initial value: false', async () => {
      const context = { a: 2, b: 1 };
      expression = jsParser.parse(context, 'a <= b');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(false);
      expect(actual).toBe(expression);
   });

   it('will emit change event for initial value: true', async () => {
      const context = { a: 1, b: 2 };
      expression = jsParser.parse(context, 'a <= b');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(true);
      expect(actual).toBe(expression);
   });

   it('will emit change event for initial value: true (equal)', async () => {
      const context = { a: 1, b: 2 };
      expression = jsParser.parse(context, 'a <= b');
     
      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(true);
      expect(actual).toBe(expression);
   });

   it('will emit change event when operands changes', async () => {
      const context = {
         a: {
            b: 2,
         },
         c: 3,
      };
      expression = jsParser.parse(context, 'a.b <= c');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.a.b = 4;
      })) as IExpression;

      expect(actual.value).toEqual(false);
      expect(actual).toBe(expression);
   });
});
