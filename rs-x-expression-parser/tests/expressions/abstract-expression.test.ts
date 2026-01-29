import { BehaviorSubject } from 'rxjs';

import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionFactory } from '../../dist';
import { type IExpression } from '../../lib/expressions/expression-parser.interface';
import {
   RsXExpressionParserModule,
   unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';

describe('AbstractExpression tests', () => {
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

   it('evaluate with constant expression', async () => {
      const expression = expressionFactory.create({}, '1 + 2');

      const actual = await new WaitForEvent(expression, 'changed').wait(() => { }) as IExpression;

      expect(actual.value).toEqual(3);
   });

   it('evaluate with identifier', async () => {
      const context = {
         a: 10,
         b: 20,
      };
      const expression = expressionFactory.create(context, 'a + b')

      const actual = await new WaitForEvent(expression, 'changed').wait(() => { }) as IExpression;

      expect(actual.value).toEqual(30);
   });

   it('expression with observable', async () => {
      const context = {
         observable: new BehaviorSubject<number>(50),
      };
      expression = expressionFactory.create(context, 'observable + 1');
      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(actual.value).toEqual(51);
      expect(actual).toBe(expression);
   });

   it('expression with promise', async () => {
      const context = {
         promise: Promise.resolve(100),
      };
      expression = expressionFactory.create(context, 'promise + 1');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(actual.value).toEqual(101);
      expect(actual).toBe(expression);
   });

   it('expression with map index', async () => {
      const context = {
         map: new Map<string, number>([
            ['one', 1],
            ['two', 2],
            ['three', 3],
         ]),
      };
      expression = expressionFactory.create(context, 'map["three"]');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(actual.value).toEqual(3);
      expect(actual).toBe(expression);
   });

   it('expression with array index', async () => {
      const context = {
         array: [11, 21, 31, 41, 51],
      };
      expression = expressionFactory.create(context, 'array[1]');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => { }
      )) as IExpression;

      expect(actual.value).toEqual(21);
      expect(actual).toBe(expression);
   });

   it('will emit change event after changing identifier', async () => {
      const context = {
         a: 10,
         b: 20,
      };
      expression = expressionFactory.create(context, 'a + b');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.a = 200;
      })) as IExpression;

      expect(actual.value).toEqual(220);
      expect(actual).toBe(expression);
   });

   it('will emit change event after changing promise', async () => {
      const context = {
         promise: Promise.resolve(100),
      };
      expression = expressionFactory.create(context, 'promise + 1');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });

      await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => { });

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.promise = Promise.resolve(200);
      })) as IExpression;

      expect(actual.value).toEqual(201);
      expect(actual).toBe(expression);
   });

   it('will emit change event after changing observable', async () => {
      const context = {
         observable: new BehaviorSubject<number>(50),
      };
      expression = expressionFactory.create(context, 'observable + 1');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.observable.next(200);
      })) as IExpression;

      expect(actual.value).toEqual(201);
      expect(actual).toBe(expression);
   });

   it('will emit change event after replacing observable', async () => {
      const context = {
         observable: new BehaviorSubject<number>(50),
      };
      expression = expressionFactory.create(context, 'observable + 1');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.observable = new BehaviorSubject(300);
      })) as IExpression;

      expect(actual.value).toEqual(301);
      expect(actual).toBe(expression);
   });

   it('will emit change event when changing array', async () => {
      const context = {
         array: [11, 21, 31, 41, 51],
      };
      expression = expressionFactory.create(context, 'array');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.array.push(61);
      })) as IExpression;

      expect(actual.value).toEqual([11, 21, 31, 41, 51, 61]);
      expect(actual).toBe(expression);
   });

   it('will emit change event when changing map', async () => {
      const context = {
         map: new Map<string, number>([
            ['one', 1],
            ['two', 2],
            ['three', 3],
         ]),
      };
      expression = expressionFactory.create(context, 'map');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.map.set('four', 4);
      })) as IExpression;

      expect(actual.value).toDeepEqualCircular(
         new Map<string, number>([
            ['one', 1],
            ['two', 2],
            ['three', 3],
            ['four', 4],
         ])
      );

      expect(actual).toBe(expression);
   });

   it('will emit change event when promise changes', async () => {
      const context = {
         a: {
            b: Promise.resolve(3),
         },
         c: 2,
      };
      expression = expressionFactory.create(context, 'a.b + c');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.a.b = Promise.resolve(4);
      })) as IExpression;

      expect(actual.value).toEqual(6);
      expect(actual).toBe(expression);
   });

   it('will emit change event when observable changes', async () => {
      const context = {
         a: {
            b: new BehaviorSubject(3),
         },
         c: 2,
      };
      expression = expressionFactory.create(context, 'a.b + c');
      // Wait till the expression has been initialized before changing value
      await new WaitForEvent(expression, 'changed').wait(() => { });

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.a.b.next(4);
      })) as IExpression;

      expect(actual.value).toEqual(6);
      expect(actual).toBe(expression);
   });
});
