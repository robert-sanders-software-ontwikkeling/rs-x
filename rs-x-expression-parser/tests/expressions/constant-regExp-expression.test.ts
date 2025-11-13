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

describe('ConstantRegExpExpression tests', () => {
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
      expression = jsParser.parse({}, '/ab+c/i');
      expect(expression.type).toEqual(ExpressionType.RegExp);
   });

   it('will emit change event for initial value', async () => {
      expression = jsParser.parse({}, '/ab+c/i');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(new RegExp('ab+c', 'i'));
      expect(actual).toBe(expression);
   });
});
