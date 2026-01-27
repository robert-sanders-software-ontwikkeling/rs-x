import { InjectionContainer, Type, WaitForEvent } from '@rs-x/core';
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

describe('InstanceofExpression tests', () => {
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
         type: Date,
         a: new Date(),
      };
      expression = jsParser.parse(context, 'a instanceof type');
      expect(expression.type).toEqual(ExpressionType.Instanceof);
   });

   it('will emit change event for initial value: true', async () => {
      const context = {
         type: Date,
         a: new Date(),
      };
      expression = jsParser.parse(context, 'a instanceof type');
      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(true);
      expect(actual).toBe(expression);
   });

   it('will emit change event for initial value: true', async () => {
      const context = {
         type: String,
         a: new Date(),
      };
      expression = jsParser.parse(context, 'a instanceof type');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(false);
      expect(actual).toBe(expression);
   });

   it('will emit change event when parameters changes', async () => {
      const context = {
         type: String.constructor,
         a: new Date(),
      };
      expression = jsParser.parse(context, 'a instanceof type');
       // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.type = Type.cast(Date);
      })) as IExpression;

      expect(actual.value).toEqual(true);
      expect(actual).toBe(expression);
   });
});
