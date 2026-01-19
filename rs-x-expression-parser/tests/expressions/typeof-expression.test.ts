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

describe('TypeofExpression tests', () => {
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
         index: 0,
         a: ['1', 1],
      };
      expression = jsParser.parse(context, 'typeof a[index]');
      expect(expression.type).toEqual(ExpressionType.Typeof);
   });

   it('will emit change event for initial value', async () => {
      const context = {
         index: 0,
         a: ['1', 1],
      };
      expression = jsParser.parse(context, 'typeof a[index]');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual('string');
      expect(actual).toBe(expression);
   });

   it('will emit change event when operands changes', async () => {
      const context = {
         index: 0,
         a: ['1', 1],
      };
      expression = jsParser.parse(context, 'typeof a[index]');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });

      const actual = (await new WaitForEvent(expression, 'changed', {ignoreInitialValue: true}).wait(() => {
         context.index = 1;
      })) as IExpression;

      expect(actual.value).toEqual('number');
      expect(actual).toBe(expression);
   });
});
