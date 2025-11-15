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

describe('SequenceExpression tests', () => {
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
         b: 2,
         value: 100,
         setB(v: number) {
            this.b = v;
         },
      };
      expression = jsParser.parse(context, '(setB(value), b)');
      expect(expression.type).toEqual(ExpressionType.Sequence);
   });

   it('will emit change event for initial value', async () => {
      const context = {
         b: null,
         value: 100,
         setB(v: number) {
            this.b = v;
         },
      };
      expression = jsParser.parse(context, '(setB(value), b)');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(100);
      expect(actual).toBe(expression);
   });

   it('will emit change event when operands changes', async () => {
      const context = {
         b: null,
         value: 100,
         setB(v: number) {
            this.b = v;
         },
      };
      expression = jsParser.parse(context, '(setB(value), b)');

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.value = 200;
      })) as IExpression;

      expect(actual.value).toEqual(200);
      expect(actual).toBe(expression);
   });
});
