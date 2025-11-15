import { InjectionContainer, WaitForEvent } from '@rs-x/core';
import { BehaviorSubject, of } from 'rxjs';
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

describe('Memmber expression tests', () => {
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
      const context = { a: { b: 1 } };
      expression = jsParser.parse(context, 'a.b');
      expect(expression.type).toEqual(ExpressionType.Member);
   });

   describe('member expression with array index', () => {
      it('Emits the initial value for a member expression with a static array index', async () => {
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

      it('Emits the initial value for a member expression with a calculated array index', async () => {
         const context = {
            a: 1,
            nestedA: {
               nestedB: {
                  array: [1000, 1100, 1200, 1300],
               },
            },
         };
         expression = jsParser.parse(context, 'nestedA.nestedB.array[a + 1]');

         const actual = (await new WaitForEvent(expression, 'changed').wait(
            () => {}
         )) as IExpression;

         expect(actual.value).toEqual(1200);
         expect(actual).toBe(expression);
      });

      it('Emits a changed value for a member expression with a calculated array index when the index is set to a new value', async () => {
         const context = {
            a: 1,
            nestedA: {
               nestedB: {
                  array: [1000, 1100, 1200, 1300],
               },
            },
         };

         expression = jsParser.parse(context, 'nestedA.nestedB.array[a + 1]');

         const actual = (await new WaitForEvent(expression, 'changed', {
            ignoreInitialValue: true,
         }).wait(() => {
            context.nestedA.nestedB.array[2] = 10;
         })) as IExpression;

         expect(actual.value).toEqual(10);
         expect(actual).toBe(expression);
      });

      it('Emits a changed value for a member expression with a calculated array index when the index value changes', async () => {
         const context = {
            a: 1,
            nestedA: {
               nestedB: {
                  array: [1000, 1100, 1200, 1300],
               },
            },
         };
         expression = jsParser.parse(context, 'nestedA.nestedB.array[a + 1]');

         const actual = (await new WaitForEvent(expression, 'changed', {
            ignoreInitialValue: true,
         }).wait(() => {
            context.a = 2;
         })) as IExpression;

         expect(actual.value).toEqual(1300);
         expect(actual).toBe(expression);
      });

      it('Emits a changed value for a member expression  when replacing a parent object', async () => {
         const context = {
            a: 1,
            nestedA: {
               nestedB: {
                  array: [1000, 1100, 1200, 1300],
               },
            },
         };
         expression = jsParser.parse(context, 'nestedA.nestedB.array[a + 1]');

         const actual = (await new WaitForEvent(expression, 'changed', {
            ignoreInitialValue: true,
         }).wait(() => {
            context.nestedA.nestedB = {
               array: [-1, -2, -3, -4],
            };
         })) as IExpression;

         expect(actual.value).toEqual(-3);
         expect(actual).toBe(expression);
      });
   });

   describe('member expression with map key', () => {
      it('Emits the initial value for a member expression with a static array index', async () => {
         const context = {
            map: new Map([
               ['a', 1],
               ['b', 2],
               ['c', 3],
            ]),
         };
         expression = jsParser.parse(context, 'map["b"]');

         const actual = (await new WaitForEvent(expression, 'changed').wait(
            () => {}
         )) as IExpression;

         expect(actual.value).toEqual(2);
         expect(actual).toBe(expression);
      });

      it('Emits the initial value for a member expression with a calculated array index', async () => {
         const context = {
            key: 'c',
            nestedA: {
               map: new Map([
                  ['a', 1],
                  ['b', 2],
                  ['c', 3],
               ]),
            },
         };
         expression = jsParser.parse(context, 'nestedA.map[key]');

         const actual = (await new WaitForEvent(expression, 'changed').wait(
            () => {}
         )) as IExpression;

         expect(actual.value).toEqual(3);
         expect(actual).toBe(expression);
      });

      it('Emits a changed value for a member expression with a calculated map key when we change the value for the key', async () => {
         const context = {
            key: 'c',
            nestedA: {
               map: new Map([
                  ['a', 1],
                  ['b', 2],
                  ['c', 3],
               ]),
            },
         };

         expression = jsParser.parse(context, 'nestedA.map[key]');

         const actual = (await new WaitForEvent(expression, 'changed', {
            ignoreInitialValue: true,
         }).wait(() => {
            context.nestedA.map.set('c', 30);
         })) as IExpression;

         expect(actual.value).toEqual(30);
         expect(actual).toBe(expression);
      });

      it('Emits a changed value for a member expression with a calculated map key when the calcuulated key chanhes', async () => {
         const context = {
            key: 'c',
            nestedA: {
               map: new Map([
                  ['a', 1],
                  ['b', 2],
                  ['c', 3],
               ]),
            },
         };

         expression = jsParser.parse(context, 'nestedA.map[key]');

         const actual = (await new WaitForEvent(expression, 'changed', {
            ignoreInitialValue: true,
         }).wait(() => {
            context.key = 'b';
         })) as IExpression;

         expect(actual.value).toEqual(2);
         expect(actual).toBe(expression);
      });

      it('Emits a changed value for a member expression  when replacing a parent object', async () => {
         const context = {
            key: 'c',
            nestedA: {
               map: new Map([
                  ['a', 1],
                  ['b', 2],
                  ['c', 3],
               ]),
            },
         };
         expression = jsParser.parse(context, 'nestedA.map[key]');

         const actual = (await new WaitForEvent(expression, 'changed', {
            ignoreInitialValue: true,
         }).wait(() => {
            context.nestedA = {
               map: new Map([
                  ['a', -1],
                  ['b', -2],
                  ['c', -3],
               ]),
            };
         })) as IExpression;

         expect(actual.value).toEqual(-3);
         expect(actual).toBe(expression);
      });
   });

   describe('member expression with observable', () => {
      it('will emit initial value', async () => {
         const context = {
            x: of({
               y: {
                  z: 100,
               },
            }),
         };

         expression = jsParser.parse(context, 'x.y.z');

         const actual = (await new WaitForEvent(expression, 'changed').wait(
            () => {}
         )) as IExpression;

         expect(actual.value).toEqual(100);
         expect(actual).toBe(expression);
      });

      it('resolves nested observables', async () => {
         const context = {
            x: of({
               y: {
                  z: of(100),
               },
            }),
         };

         expression = jsParser.parse(context, 'x.y.z');

         const actual = (await new WaitForEvent(expression, 'changed').wait(
            () => {}
         )) as IExpression;

         expect(actual.value).toEqual(100);
         expect(actual).toBe(expression);
      });

      it('will emit change event when changing obserable', async () => {
         const context = {
            x: of({
               y: {
                  z: of(100),
               },
            }),
         };

         expression = jsParser.parse(context, 'x.y.z');

         await new WaitForEvent(expression, 'changed', {
            ignoreInitialValue: true,
         }).wait(() => {});

         const actual = (await new WaitForEvent(expression, 'changed', {
            ignoreInitialValue: true,
         }).wait(() => {
            context.x = of({
               y: { z: of(200) },
            });
         })) as IExpression;

         expect(actual.value).toEqual(200);
         expect(actual).toBe(expression);
      });

      it('will emit change event when nested obserable emit new value', async () => {
         const nestedContext = {
            y: {
               z: new BehaviorSubject(100),
            },
         };
         const context = {
            x: of(nestedContext),
         };

         expression = jsParser.parse(context, 'x.y.z');

         await new WaitForEvent(expression, 'changed', {
            ignoreInitialValue: true,
         }).wait(() => {});

         const actual = (await new WaitForEvent(expression, 'changed', {
            ignoreInitialValue: true,
         }).wait(() => {
            nestedContext.y.z.next(200);
         })) as IExpression;

         expect(actual.value).toEqual(200);
         expect(actual).toBe(expression);
      });

      it('will emit change event when obserable emit new value', async () => {
         const context = {
            x: new BehaviorSubject({
               y: {
                  z: of(100),
               },
            }),
         };

         expression = jsParser.parse(context, 'x.y.z');

         await new WaitForEvent(expression, 'changed', {
            ignoreInitialValue: true,
         }).wait(() => {});

         const actual = (await new WaitForEvent(expression, 'changed', {
            ignoreInitialValue: true,
         }).wait(() => {
            context.x.next({
               y: {
                  z: of(200),
               },
            });
         })) as IExpression;

         expect(actual.value).toEqual(200);
         expect(actual).toBe(expression);
      });
   });

   describe('member expression with promises', () => {
      it('will emit initial value', async () => {
         const context = {
            x: Promise.resolve({
               y: {
                  z: 100,
               },
            }),
         };

         expression = jsParser.parse(context, 'x.y.z');

         const actual = (await new WaitForEvent(expression, 'changed').wait(
            () => {}
         )) as IExpression;

         expect(actual.value).toEqual(100);
         expect(actual).toBe(expression);
      });

      it('resolves nested promised', async () => {
         const context = {
            x: Promise.resolve({
               y: {
                  z: Promise.resolve(100),
               },
            }),
         };

         expression = jsParser.parse(context, 'x.y.z');

         const actual = (await new WaitForEvent(expression, 'changed').wait(
            () => {}
         )) as IExpression;

         expect(actual.value).toEqual(100);
         expect(actual).toBe(expression);
      });

      it('will emit change event when changing promise', async () => {
         const context = {
            x: Promise.resolve({
               y: {
                  z: Promise.resolve(100),
               },
            }),
         };

         expression = jsParser.parse(context, 'x.y.z');

         await new WaitForEvent(expression, 'changed', {
            ignoreInitialValue: true,
         }).wait(() => {});

         const actual = (await new WaitForEvent(expression, 'changed', {
            ignoreInitialValue: true,
         }).wait(() => {
            context.x = Promise.resolve({
               y: { z: Promise.resolve(200) },
            });
         })) as IExpression;

         expect(actual.value).toEqual(200);
         expect(actual).toBe(expression);
      });
   });
});
