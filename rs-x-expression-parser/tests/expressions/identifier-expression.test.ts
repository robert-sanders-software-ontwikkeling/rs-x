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

describe('IdentifierExpression tests', () => {
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
      const context = { a: 1 };
      expression = jsParser.parse(context, 'a');
      expect(expression.type).toEqual(ExpressionType.Identifier);
   });

   it('will emit change event for initial value', async () => {
      const context = { a: 1 };
      expression = jsParser.parse(context, 'a');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(1);
      expect(actual).toBe(expression);
   });

   it('will emit change event when identifier value changes', async () => {
      const context = { a: 1 };
      expression = jsParser.parse(context, 'a');

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.a = 100;
      })) as IExpression;

      expect(actual.value).toEqual(100);
      expect(actual).toBe(expression);
   });
});
