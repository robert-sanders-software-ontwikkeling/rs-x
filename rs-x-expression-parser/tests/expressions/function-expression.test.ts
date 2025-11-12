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

describe('FunctionExpression tests', () => {
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
      const context = { a: 10, multiplWithTwo: (a: number) => 2 * a };
      expression = jsParser.parse(context, 'multiplWithTwo(a)');
      expect(expression.type).toEqual(ExpressionType.Function);
   });

   it('method on root object', async () => {
      const context = { a: 10, multiplWithTwo: (a: number) => 2 * a };
      expression = jsParser.parse(context, 'multiplWithTwo(a)');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(20);
      expect(actual).toBe(expression);
   });

   it('method on nested object', async () => {
      const context = {
         a: 10,
         b: {
            x: 10,
            multiply(a: number) {
               return this.x * a;
            },
         },
      };
      expression = jsParser.parse(context, 'b.multiply(a)');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(100);
      expect(actual).toBe(expression);
   });

   it('computed method on nested object', async () => {
      const context = {
         a: 10,
         b: {
            methodName: 'multiply',
            x: 10,
            multiply(a: number) {
               return this.x * a;
            },
         },
      };
      expression = jsParser.parse(context, 'b[b.methodName](a)');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(100);
      expect(actual).toBe(expression);
   });

   it('method on root object: change event is emitted when arguments changes', async () => {
      const context = { a: 10, multiplWithTwo: (a: number) => 2 * a };
      expression = jsParser.parse(context, 'multiplWithTwo(a)');

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.a = 20;
      })) as IExpression;

      expect(actual.value).toEqual(40);
      expect(actual).toBe(expression);
   });

   it('method on root object: change event is emitted when arguments changes', async () => {
      const context = {
         a: 10,
         b: {
            methodName: 'multiply',
            x: 10,
            multiply(a: number) {
               return this.x * a;
            },
         },
      };
      expression = jsParser.parse(context, 'b[b.methodName](a)');

      const actual = (await new WaitForEvent(expression, 'changed').wait(() => {
         context.a = 20;
      })) as IExpression;

      expect(actual.value).toEqual(200);
      expect(actual).toBe(expression);
   });

   it('computed method on nested object: change event is emitted when owner object is replaced', async () => {
      const context = {
         a: 10,
         b: {
            methodName: 'multiply',
            x: 10,
            multiply(a: number) {
               return this.x * a;
            },
         },
      };
      expression = jsParser.parse(context, 'b[b.methodName](a)');

      const actual = (await new WaitForEvent(expression, 'changed').wait(() => {
         context.b = {
            methodName: 'multiply',
            x: 30,
            multiply(a: number) {
               return this.x * a;
            },
         };
      })) as IExpression;

      expect(actual.value).toEqual(300);
      expect(actual).toBe(expression);
   });

   it('computed method on nested object: change event is emitted when changing method name', async () => {
      const context = {
         a: 10,
         b: {
            methodName: 'multiply',
            x: 10,
            multiply(a: number) {
               return this.x * a;
            },
            add(a: number) {
               return this.x + a;
            },
         },
      };
      expression = jsParser.parse(context, 'b[b.methodName](a)');

      const actual = (await new WaitForEvent(expression, 'changed').wait(() => {
         context.b.methodName = 'add';
      })) as IExpression;

      expect(actual.value).toEqual(20);
      expect(actual).toBe(expression);
   });
});
