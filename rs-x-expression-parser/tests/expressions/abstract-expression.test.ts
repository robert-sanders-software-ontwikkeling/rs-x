import { InjectionContainer, WaitForEvent } from '@rs-x-core';
import { BehaviorSubject } from 'rxjs';
import {
   IExpression,
   IExpressionParser,
} from '../../lib/expressions/interfaces';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';
import {
   RsXExpressionParserModule,
   unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';

describe('AbstractExpression tests', () => {
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

   it('evaluate with constant expression', () => {
      const expression = jsParser.parse({}, '1 + 2');

      expect(expression.value).toEqual(3);
   });

   it('evaluate with identifier', () => {
      const context = {
         a: 10,
         b: 20,
      };
      const expression = jsParser.parse(context, 'a + b');

      expect(expression.value).toEqual(30);
   });

   it('will emit initial value', async () => {
      const context = {
         a: 10,
         b: 20,
      };
      expression = jsParser.parse(context, 'a + b');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(30);
      expect(actual).toBe(expression);
   });

   it('will emit initial value for expression with observable', async () => {
      const context = {
         observable: new BehaviorSubject<number>(50),
      };
      expression = jsParser.parse(context, 'observable + 1');
      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(51);
      expect(actual).toBe(expression);
   });

   it('will emit initial value for expression with promise', async () => {
      const context = {
         promise: Promise.resolve(100),
      };
      expression = jsParser.parse(context, 'promise + 1');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(101);
      expect(actual).toBe(expression);
   });

   it('will emit initial value for expression with map index', async () => {
      const context = {
         map: new Map<string, number>([
            ['one', 1],
            ['two', 2],
            ['three', 3],
         ]),
      };
      expression = jsParser.parse(context, 'map["three"]');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(3);
      expect(actual).toBe(expression);
   });

   it('will emit initial value for expression with map index', async () => {
      const context = {
         array: [11, 21, 31, 41, 51],
      };
      expression = jsParser.parse(context, 'array[1]');

      const actual = (await new WaitForEvent(expression, 'changed').wait(
         () => {}
      )) as IExpression;

      expect(actual.value).toEqual(21);
      expect(actual).toBe(expression);
   });

   it('will emit change event after changing identifier', async () => {
      const context = {
         a: 10,
         b: 20,
      };
      expression = jsParser.parse(context, 'a + b');

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
      expression = jsParser.parse(context, 'promise + 1');

      await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {});

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
      expression = jsParser.parse(context, 'observable + 1');

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
      expression = jsParser.parse(context, 'observable + 1');

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
      expression = jsParser.parse(context, 'array');

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
      expression = jsParser.parse(context, 'map');

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
      expression = jsParser.parse(context, 'a.b + c');
      await new WaitForEvent(expression, 'changed').wait(() => {});

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
      expression = jsParser.parse(context, 'a.b + c');
      await new WaitForEvent(expression, 'changed').wait(() => {});

      const actual = (await new WaitForEvent(expression, 'changed', {
         ignoreInitialValue: true,
      }).wait(() => {
         context.a.b.next(4);
      })) as IExpression;

      expect(actual.value).toEqual(6);
      expect(actual).toBe(expression);
   });
});
