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

describe('ConstantStringExpression tests', () => {
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
      expression = jsParser.parse({}, '"hi"');
      expect(expression.type).toEqual(ExpressionType.String);
   });

   it('type: backtick', () => {
      expression = jsParser.parse({}, '`hi`');
      expect(expression.type).toEqual(ExpressionType.String);
   });

   it('will emit change event for initial value: double quotes', async () => {
      expression = jsParser.parse({}, '"hi"');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual('hi');
      expect(actual).toBe(expression);
   });

   it('will emit change event for initial value: single quotes', async () => {
      expression = jsParser.parse({}, "'hi'");

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual('hi');
      expect(actual).toBe(expression);
   });

   it('will emit change event for initial value: backtick', async () => {
      expression = jsParser.parse({}, '`hi`');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual('hi');
      expect(actual).toBe(expression);
   });
});
