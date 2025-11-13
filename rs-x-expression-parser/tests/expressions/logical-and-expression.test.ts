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

describe('LogicalAndExpression tests', () => {
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
      const context = { a: true, b: true };
      expression = jsParser.parse(context, 'a && b');
      expect(expression.type).toEqual(ExpressionType.And);
   });

   it('will emit change event for initial value', async () => {
      const context = { a: true, b: true };
      expression = jsParser.parse(context, 'a && b');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(true);
      expect(actual).toBe(expression);
   });

   it('will emit change event when operands changes', async () => {
      const context = {
         a: {
            b: true,
         },
         c: true,
      };
      expression = jsParser.parse(context, 'a.b && c');

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.a.b = false;
      })) as IExpression;

      expect(actual.value).toEqual(false);
      expect(actual).toBe(expression);
   });
});
