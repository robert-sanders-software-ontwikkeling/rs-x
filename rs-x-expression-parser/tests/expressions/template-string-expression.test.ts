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

describe('TemplateStringExpression tests', () => {
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
      const context = { name: 'Robert' };
      expression = jsParser.parse(context, '`Hello ${name}`');
      expect(expression.type).toEqual(ExpressionType.TemlateString);
   });

   it('will emit change event for initial value', async () => {
      const context = { name: 'Robert' };
      expression = jsParser.parse(context, '`Hello ${name}`');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual('Hello Robert');
      expect(actual).toBe(expression);
   });

   it('will emit change event when operands changes', async () => {
      const context = { name: 'Robert' };
      expression = jsParser.parse(context, '`Hello ${name}`');

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.name = 'Pietje';
      })) as IExpression;

      expect(actual.value).toEqual('Hello Pietje');
      expect(actual).toBe(expression);
   });
});
