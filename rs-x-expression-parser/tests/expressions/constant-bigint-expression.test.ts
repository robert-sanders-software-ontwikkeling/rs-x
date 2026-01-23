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

describe('ConstantBigIntExpression tests', () => {
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
      expression = jsParser.parse({}, '9007199254740991n');
      expect(expression.type).toEqual(ExpressionType.BigInt);
   });

   it('will emit change event for initial value', async () => {
      expression = jsParser.parse({}, '9007199254740991n');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(9007199254740991n);
      expect(actual).toBe(expression);
   });
});
