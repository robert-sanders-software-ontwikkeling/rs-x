import { InjectionContainer, WaitForEvent } from '@rs-x-core';
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

describe('AdditionExpression tests', () => {
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
      expression = jsParser.parse(context, 'a + b');
      expect(expression.type).toEqual(ExpressionType.Addition);
   });

   it('will emit change event for initial value', async () => {
      const context = { a: 1, b: 2 };
      expression = jsParser.parse(context, 'a + b');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(3);
      expect(actual).toBe(expression);
   });

   it('will emit change event when operands changes', async () => {
      const context = {
         a: {
            b: 3,
         },
         c: 2,
      };
      expression = jsParser.parse(context, 'a.b + c');

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.a.b = 4;
      })) as IExpression;

      expect(actual.value).toEqual(6);
      expect(actual).toBe(expression);
   });
});
