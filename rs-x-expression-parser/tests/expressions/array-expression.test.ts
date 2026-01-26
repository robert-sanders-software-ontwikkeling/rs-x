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

describe('Array expression tests', () => {
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
      expression = jsParser.parse({}, '[1,2]');
      expect(expression.type).toEqual(ExpressionType.Array);
   });

   it('will emit change event for initial value: [1, 2]', async () => {
      expression = jsParser.parse({}, '[1, 2]');
      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(expression.value).toEqual([1, 2]);
      expect(actual).toBe(expression);
   });

   it('will emit change event for initial value: [1, ...[2, 3]]', async () => {
      expression = jsParser.parse({}, ' [1, ...[2, 3]]');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;
      
      expect(expression.value).toEqual([1, 2, 3]);
      expect(actual).toBe(expression);
   });

   it('will emit change event when one of the identifiers in array expression changes', async () => {
      const context = {
         array: [2, 3],
      };
      expression = jsParser.parse(context, ' [1, ...array]');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });


      const actual = (await new WaitForEvent(expression, 'changed').wait(() => {
         context.array.push(4);
      })) as IExpression;

      expect(expression.value).toEqual([1, 2, 3, 4]);
      expect(actual).toBe(expression);
   });
});
