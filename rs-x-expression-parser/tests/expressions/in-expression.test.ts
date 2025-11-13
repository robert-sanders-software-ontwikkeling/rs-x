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

describe('InExpression tests', () => {
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
         b: {
            hello: 'hi',
         },
      };
      expression = jsParser.parse(context, ' "hello" in b');
      expect(expression.type).toEqual(ExpressionType.In);
   });

   it('will emit change event for initial value: true', async () => {
      const context = {
         b: {
            hello: 'hi',
         },
      };
      expression = jsParser.parse(context, ' "hello" in b');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(true);
      expect(actual).toBe(expression);
   });

   it('will emit change event for initial value: false', async () => {
      const context = {
         b: {
            hello: 'hi',
         },
      };
      expression = jsParser.parse(context, ' "x" in b');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(false);
      expect(actual).toBe(expression);
   });

   it('will emit change event when argument changes', async () => {
      const context = {
         propertyName: 'hello',
         b: {
            hello: 'hi',
         },
      };
      expression = jsParser.parse(context, ' propertyName in b');

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.propertyName = 'x';
      })) as IExpression;

      expect(actual.value).toEqual(false);
      expect(actual).toBe(expression);
   });
});
