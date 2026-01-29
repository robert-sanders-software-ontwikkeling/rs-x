import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionChangeTransactionManager } from '../../lib/expresion-change-transaction-manager.interface';
import type { IExpressionFactory } from '../../lib/expression-factory/expression-factory.interface';
import { ExpressionType, type IExpression } from '../../lib/expressions/expression-parser.interface';
import { SequenceExpression } from '../../lib/expressions/sequence-expression';
import {
   RsXExpressionParserModule,
   unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';

describe('SequenceExpression tests', () => {
   let expressionFactory: IExpressionFactory;
   let expression: IExpression | undefined;

   beforeAll(async () => {
      await InjectionContainer.load(RsXExpressionParserModule);
      expressionFactory = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionFactory
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
      expression = expressionFactory.create(context, '(setB(value), b)');
      expect(expression.type).toEqual(ExpressionType.Sequence);
   });

   it('clone', async () => {
      const transactionManager: IExpressionChangeTransactionManager = InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager);

      const context: { b: number | null; value: number; setB(v: number): void } = {
         b: null,
         value: 100,
         setB(v: number) {
            this.b = v;
         },
      };
      expression = expressionFactory.create(context, '(setB(value), b)');

      const clonedExpression = expression.clone();

      try {
         expect(clonedExpression).toBeInstanceOf(SequenceExpression);
         expect(clonedExpression.type).toEqual(ExpressionType.Sequence);
         expect(clonedExpression.expressionString).toEqual('(setB(value), b)');

         await new WaitForEvent(clonedExpression, 'changed').wait(() => {
            clonedExpression.bind({
               transactionManager,
               rootContext: context
            });

            transactionManager.commit();
         });
         expect(clonedExpression.value).toEqual(100);
      } finally {
         clonedExpression.dispose();
      }
   });

   it('will emit change event for initial value', async () => {
      const context: { b: number | null; value: number; setB(v: number): void } = {
         b: null,
         value: 100,
         setB(v: number) {
            this.b = v;
         },
      };
      expression = expressionFactory.create(context, '(setB(value), b)');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(actual.value).toEqual(100);
      expect(actual).toBe(expression);
   });

   it('will emit change event when operands changes', async () => {
      const context: { b: number | null; value: number; setB(v: number): void } = {
         b: null,
         value: 100,
         setB(v: number) {
            this.b = v;
         },
      };
      expression = expressionFactory.create(context, '(setB(value), b)');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.value = 200;
      })) as IExpression;

      expect(actual.value).toEqual(200);
      expect(actual).toBe(expression);
   });
});
