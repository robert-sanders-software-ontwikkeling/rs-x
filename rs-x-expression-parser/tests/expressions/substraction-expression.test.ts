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

describe('SubtractionExpression tests', () => {
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
      expression = jsParser.parse(context, 'a - b');
      expect(expression.type).toEqual(ExpressionType.Subtraction);
   });

   it('will emit change event for initial value', async () => {
      const context = { a: 1, b: 2 };
      expression = jsParser.parse(context, 'a - b');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(-1);
      expect(actual).toBe(expression);
   });

   it('will emit change event when operands changes', async () => {
      const context = { a: 1, b: 2 };
      expression = jsParser.parse(context, 'a - b');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.b = 4;
      })) as IExpression;

      expect(actual.value).toEqual(-3);
      expect(actual).toBe(expression);
   });
});
