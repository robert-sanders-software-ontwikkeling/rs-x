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

describe('ConditionalExpression tests', () => {
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
      const context = { a: 1, b: 2, c: 100, d: 200 };
      expression = jsParser.parse(context, 'a > b ? c : d');
      expect(expression.type).toEqual(ExpressionType.Conditional);
   });

   it('will return consequent if condition is true', async () => {
      const context = { a: 10, b: 2, c: 100, d: 200 };
      expression = jsParser.parse(context, 'a > b ? c : d');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(100);
      expect(actual).toBe(expression);
   });

   it('will return alternate if condition is false', async () => {
      const context = { a: 1, b: 2, c: 100, d: 200 };
      expression = jsParser.parse(context, 'a > b ? c : d');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(200);
      expect(actual).toBe(expression);
   });

   it('will return emit change event when condition changes', async () => {
      const context = { a: 1, b: 2, c: 100, d: 200 };
      expression = jsParser.parse(context, 'a > b ? c : d');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });


      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.a = 3;
      })) as IExpression;

      expect(actual.value).toEqual(100);
      expect(actual).toBe(expression);
   });

   it('will emit change event if consequent changes', async () => {
      const context = { a: 10, b: 2, c: 100, d: 200 };
      expression = jsParser.parse(context, 'a > b ? c : d');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });


      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.c = 400;
      })) as IExpression;

      expect(actual.value).toEqual(400);
      expect(actual).toBe(expression);
   });

   it('will not emit change event if condition is true and changing alternate', async () => {
      const context = { a: 10, b: 2, c: 100, d: 200 };
      expression = jsParser.parse(context, 'a > b ? c : d');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });


      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.d = 400;
      })) as IExpression;

      expect(actual).toBeNull();
   });

   it('will emit change event if alternate changes', async () => {
      const context = { a: 1, b: 2, c: 100, d: 200 };
      expression = jsParser.parse(context, 'a > b ? c : d');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });


      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.d = 400;
      })) as IExpression;

      expect(actual.value).toEqual(400);
      expect(actual).toBe(expression);
   });

   it('will not emit change event if condition is false and changing consequent', async () => {
      const context = { a: 1, b: 2, c: 100, d: 200 };
      expression = jsParser.parse(context, 'a > b ? c : d');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });


      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.c = 400;
      })) as IExpression;

      expect(actual).toBeNull();
   });
});
