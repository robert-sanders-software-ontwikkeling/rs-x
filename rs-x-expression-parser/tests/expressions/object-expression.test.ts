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

describe('ObjectExpression tests', () => {
   let jsParser: IExpressionParser;
   let expression: IExpression | undefined;

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
         x: 10,
         y: 20,
      };
      expression = jsParser.parse(context, '({ a: x, b: y })');
      expect(expression.type).toEqual(ExpressionType.Object);
   });

   it('will emit change event for initial value', async () => {
      const context = {
         x: 10,
         y: 20,
      };
      expression = jsParser.parse(context, '({ a: x, b: y })');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual({ a: 10, b: 20 });
      expect(actual).toBe(expression);
   });

   it('will emit change event when parameters changes', async () => {
      const context = {
         x: 10,
         y: 20,
      };
      expression = jsParser.parse(context, '({ a: x, b: y })');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.x = 201;
      })) as IExpression;

      expect(actual.value).toEqual({ a: 201, b: 20 });
      expect(actual).toBe(expression);
   });
});
