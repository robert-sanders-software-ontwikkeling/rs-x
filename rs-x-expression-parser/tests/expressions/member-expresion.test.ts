import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
import { BehaviorSubject, of } from 'rxjs';
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

describe('Member expression tests', () => {
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
            () => { }
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

         const actual = (await new WaitForEvent(expression, 'changed').wait(() => { })) as IExpression;

         expect(actual.value).toEqual(1200);
         expect(actual).toBe(expression);
      });

      it('dynamic index on root array: emit change event for initial value', async () => {
         const context = {
            index: 0,
            a: ['1', 1],
         };
         expression = jsParser.parse(context, 'a[index]');

         const actual = (await new WaitForEvent(expression, 'changed').wait(() => { })) as IExpression;

         expect(actual.value).toEqual('1');
         expect(actual).toBe(expression);
      })

      it('dynamic index on root array: emit value when dynamic index changes', async () => {
         const context = {
            index: 0,
            a: ['1', 1],
         };
         expression = jsParser.parse(context, 'a[index]');
         // Wait till the expression has been initialized before changing value
         await new WaitForEvent(expression, 'changed').wait(() => { });

         const actual = (await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            context.index = 1;
         })) as IExpression;

         expect(actual.value).toEqual(1);
         expect(actual).toBe(expression);
      })

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

         // Wait till the expression has been initialized before changing value
         await new WaitForEvent(expression, 'changed').wait(() => { });

         const actual = (await new WaitForEvent(expression, 'changed').wait(() => {
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

         // Wait till the expression has been initialized before changing value
         await new WaitForEvent(expression, 'changed').wait(() => { });

         expect(expression.value).toEqual(1200);

         const actual = (await new WaitForEvent(expression, 'changed').wait(() => {
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

         // Wait till the expression has been initialized before changing value
         await new WaitForEvent(expression, 'changed').wait(() => { });

         const actual = (await new WaitForEvent(expression, 'changed').wait(() => {
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
            () => { }
         )) as IExpression;

         expect(actual.value).toEqual(2);
         expect(actual).toBe(expression);
      });

      it('Emits the initial value for a member expression with a calculated map key', async () => {
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
            () => { }
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

         // Wait till the expression has been initialized before changing value
         await new WaitForEvent(expression, 'changed').wait(() => { });


         const actual = (await new WaitForEvent(expression, 'changed').wait(() => {
            context.nestedA.map.set('c', 30);
         })) as IExpression;

         expect(actual.value).toEqual(30);
         expect(actual).toBe(expression);
      });

      it('Emits a changed value for a member expression with a calculated map key when the calcuulated key changed', async () => {
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

         // Wait till the expression has been initialized before changing value
         await new WaitForEvent(expression, 'changed').wait(() => { });


         const actual = (await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true },).wait(() => {
            context.key = 'b';
         })) as IExpression;

         expect(actual.value).toEqual(2);
         expect(actual).toBe(expression);
      });

      it('Emits a changed value for a member expression  when replacing a parent object directly', async () => {
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

         await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(emptyFunction);

         const actual = await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            context.nestedA = {
               map: new Map([
                  ['a', -1],
                  ['b', -2],
                  ['c', -3],
               ]),
            };
         }) as IExpression;

         expect(actual.value).toEqual(-3);
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

         // Wait till the expression has been initialized before changing value
         await new WaitForEvent(expression, 'changed').wait(() => { });

         const actual = await new WaitForEvent(expression, 'changed').wait(() => {
            context.nestedA = {
               map: new Map([
                  ['a', -1],
                  ['b', -2],
                  ['c', -3],
               ]),
            };
         }) as IExpression;

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
            () => { }
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
            () => { }
         )) as IExpression;

         expect(expression.value).toEqual(100);
         expect(actual).toBe(expression);
      });

      it('will emit change event when changing observable', async () => {
         const context = {
            x: of({
               y: {
                  z: of(100),
               },
            }),
         };

         expression = jsParser.parse(context, 'x.y.z');

         // Wait till the expression has been initialized before changing value
         await new WaitForEvent(expression, 'changed').wait(() => { });

         const actual = (await new WaitForEvent(expression, 'changed', {}).wait(() => {
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

         // Wait till the expression has been initialized before changing value
         await new WaitForEvent(expression, 'changed').wait(() => { });

         const actual = (await new WaitForEvent(expression, 'changed').wait(() => {
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

         // Wait till the expression has been initialized before changing value
         await new WaitForEvent(expression, 'changed').wait(() => { });

         const actual = (await new WaitForEvent(expression, 'changed').wait(() => {
            context.x.next({
               y: {
                  z: of(200),
               },
            });
         })) as IExpression;

         expect(actual.value).toEqual(200);
         expect(actual).toBe(expression);
      });

      it('multiple nested obserable emit new value', async () => {
         const nestedObservable = new BehaviorSubject({ d: 200 });
         const rootObservable = new BehaviorSubject({ c: nestedObservable });
         const expressionContext = {
            a: {
               b: new BehaviorSubject(
                  {
                     c: new BehaviorSubject({ d: 20 })
                  }
               )
            }
         };
         const expression = jsParser.parse(expressionContext, `a.b.c.d`);

         await new WaitForEvent(expression, 'changed').wait(emptyFunction);
         expect(expression.value).toEqual(20);

         await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionContext.a = { b: rootObservable }
         });
         expect(expression.value).toEqual(200);

         await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            nestedObservable.next({ d: 300 });
         });
         expect(expression.value).toEqual(300);

         await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            rootObservable.next({
               c: new BehaviorSubject({ d: 400 })
            })
         });
         expect(expression.value).toEqual(400);
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
            () => { }
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
            () => { }
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

         // Wait till the expression has been initialized before changing value
         await new WaitForEvent(expression, 'changed').wait(() => { });


         const actual = (await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            context.x = Promise.resolve({
               y: { z: Promise.resolve(200) },
            });
         })) as IExpression;

         expect(actual.value).toEqual(200);
         expect(actual).toBe(expression);
      });

      it('will emit change event when changing object with nested promise', async () => {
         const context = {
            a: {
               b: Promise.resolve({
                  c: Promise.resolve({
                     d: 20
                  })
               })
            }
         };

         expression = jsParser.parse(context, 'a.b.c.d');

         // Wait till the expression has been initialized before changing value
         await new WaitForEvent(expression, 'changed').wait(() => { });


         const actual = (await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            context.a = {
               b: Promise.resolve({
                  c: Promise.resolve({
                     d: 200
                  })
               })
            };
         })) as IExpression;

         expect(actual.value).toEqual(200);
         expect(actual).toBe(expression);
      });
   });

   describe('member expression with object array', () => {
      it(`initial value of 'a.b[1].c.d')`, async () => {
         const expressionContext = {
            a: {
               b: [
                  {
                     c: {
                        d: 10
                     }
                  },
                  {
                     c: {
                        d: 11
                     }
                  },
               ]
            },
            x: { y: 1 }
         };

         const expression = jsParser.parse(expressionContext, 'a.b[1].c.d');

         await new WaitForEvent(expression, 'changed').wait(() => { });

         expect(expression.value).toEqual(11)

      });

      it(`value of 'a.b[1].c.d') after changing 'a' to '{b: [{ c: { d: 100}},{ c: { d: 110}}}`, async () => {
         const expressionContext = {
            a: {
               b: [
                  {
                     c: {
                        d: 10
                     }
                  },
                  {
                     c: {
                        d: 11
                     }
                  },
               ]
            },
            x: { y: 1 }
         };
         const expression = jsParser.parse(expressionContext, 'a.b[1].c.d');

         // Wait till the expression has been initialized before changing value
         await new WaitForEvent(expression, 'changed').wait(() => { });


         await new WaitForEvent(expression, 'changed', {ignoreInitialValue: true}).wait(() => {
            expressionContext.a = {
               b: [
                  {
                     c: {
                        d: 100
                     }
                  },
                  {
                     c: {
                        d: 110
                     }
                  },
               ]
            };
         });

         expect(expression.value).toEqual(110)

      });

      it(`value of 'a.b[1].c.d' after changing b[1] to '{ c: { d: 120}}`, async () => {
         const expressionContext = {
            a: {
               b: [
                  {
                     c: {
                        d: 10
                     }
                  },
                  {
                     c: {
                        d: 11
                     }
                  },
               ]
            },
            x: { y: 1 }
         };
         const expression = jsParser.parse(expressionContext, 'a.b[1].c.d');

         // Wait till the expression has been initialized before changing value
         await new WaitForEvent(expression, 'changed').wait(emptyFunction);

         await new WaitForEvent(expression, 'changed', {ignoreInitialValue: true}).wait(() => {
            expressionContext.a.b[1] = {
               c: {
                  d: 120
               }
            };
         });

         expect(expression.value).toEqual(120)
      });

      it(`value of 'a.b[1].c.d' after changing b[1].c to '{d: 220}`, async () => {
         const expressionContext = {
            a: {
               b: [
                  {
                     c: {
                        d: 10
                     }
                  },
                  {
                     c: {
                        d: 11
                     }
                  },
               ]
            },
            x: { y: 1 }
         };
         const expression = jsParser.parse(expressionContext, 'a.b[1].c.d');

         // Wait till the expression has been initialized before changing value
         await new WaitForEvent(expression, 'changed').wait(() => { });

         await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionContext.a.b[1].c = { d: 220 };
         });

         expect(expression.value).toEqual(220)
      });

      it(`Value of a.b[1].c.d after first changing path segements.`, async () => {
         const expressionContext = {
            a: {
               b: [
                  {
                     c: {
                        d: 10
                     }
                  },
                  {
                     c: {
                        d: 11
                     }
                  },
               ]
            },
            x: { y: 1 }
         };
         const expression = jsParser.parse(expressionContext, 'a.b[1].c.d');

         await new WaitForEvent(expression, 'changed').wait(() => { });

         expect(expression.value).toEqual(11);

         await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionContext.a = {
               b: [
                  {
                     c: {
                        d: 100
                     }
                  },
                  {
                     c: {
                        d: 110
                     }
                  },
               ]
            };
         });

         expect(expression.value).toEqual(110);

         await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionContext.a.b[1] = {
               c: {
                  d: 120
               }
            };
         });

         expect(expression.value).toEqual(120);

         await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionContext.a.b[1].c = { d: 130 };
         });

         expect(expression.value).toEqual(130);


         await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionContext.a.b[1].c.d = 140
         });

         expect(expression.value).toEqual(140);
      });
   });

   describe('member expression with method', () => {
      it(`will emit initial value for 'a.b.mail(message, subject).messageWithSubject'`, async () => {
         const expressionContext = {
            message: 'Hello',
            subject: 'Message',
            a: {
               b: {
                  mail: (message: string, subject: string) => {
                     return {
                        messageWithSubject: `message: ${message}, subject: ${subject}`
                     };

                  }
               }
            }
         };

         const expression = jsParser.parse(expressionContext, 'a.b.mail(message, subject).messageWithSubject');
         const actual = await new WaitForEvent(expression, 'changed').wait(emptyFunction) as IExpression;

         expect(actual.value).toEqual('message: Hello, subject: Message');

      });

      it(`will emit change for 'a.b.mail(message, subject).messageWithSubject' when setting 'message'`, async () => {
         const expressionContext = {
            message: 'Hello',
            subject: 'Message',
            a: {
               b: {
                  mail: (message: string, subject: string) => {
                     return {
                        messageWithSubject: `message: ${message}, subject: ${subject}`
                     };

                  }
               }
            }
         };

         const expression = jsParser.parse(expressionContext, 'a.b.mail(message, subject).messageWithSubject');
         await new WaitForEvent(expression, 'changed').wait(emptyFunction);


         const actual = await new WaitForEvent(expression, 'changed').wait(() => {
            expressionContext.message = 'hi'
         }) as IExpression;


         expect(actual.value).toEqual('message: hi, subject: Message');
      });
   });

   describe('member expression with complex expression with observabble', () => {
      it('initial value', async () => {
         const expressionContext = {
            parameters: new BehaviorSubject({
               a: 10,
               b: 20
            })
         };

         expression = jsParser.parse(expressionContext, 'parameters.a + parameters.b');

         await new WaitForEvent(expression, 'changed').wait(emptyFunction);

         expect(expression.value).toEqual(30);
      });

      it('will emit change event when new parameters have been emitted', async () => {
         const expressionContext = {
            parameters: new BehaviorSubject({
               a: 10,
               b: 20
            })
         };

         expression = jsParser.parse(expressionContext, 'parameters.a + parameters.b');

         await new WaitForEvent(expression, 'changed').wait(emptyFunction);

         await new WaitForEvent(expression, 'changed', { count: 2 }).wait(() => {
            expressionContext.parameters.next({
               a: 5,
               b: 20
            })
         });

         expect(expression.value).toEqual(25);
      });

   })

   it('Only relevant identifiers will be observed.', async () => {
      const expressionContext = {
         a: {
            b: {
               c: 10,
               d: 20,
            },
            e: 30
         },
         f: 40
      };
      const expression = jsParser.parse(expressionContext, 'a.b');
      await new WaitForEvent(expression, 'changed').wait(emptyFunction);

      expect(expressionContext).isWritableProperty('a');
      expect(expressionContext.a).isWritableProperty('b');
      expect(expressionContext.a.b).isWritableProperty('c');
      expect(expressionContext.a.b).isWritableProperty('d');
      expect(expressionContext.a).not.isWritableProperty('e');
      expect(expressionContext).not.isWritableProperty('f');
   });

   it('Watched identifiers will be released when the associated expressions are disposed.', async () => {
      const expressionContext = {
         a: {
            b: {
               c: 10,
               d: 20,
            },
            e: 30
         },
         f: 40
      };
      const expression = jsParser.parse(expressionContext, 'a.b');
      await new WaitForEvent(expression, 'changed').wait(emptyFunction);

      expect(expressionContext).isWritableProperty('a');
      expect(expressionContext.a).isWritableProperty('b');
      expect(expressionContext.a.b).isWritableProperty('c');
      expect(expressionContext.a.b).isWritableProperty('d');
      expect(expressionContext.a).not.isWritableProperty('e');
      expect(expressionContext).not.isWritableProperty('f');


      expression.dispose();


      expect(expressionContext).not.isWritableProperty('a');
      expect(expressionContext.a).not.isWritableProperty('b');
      expect(expressionContext.a.b).not.isWritableProperty('c');
      expect(expressionContext.a.b).not.isWritableProperty('d');
      expect(expressionContext.a).not.isWritableProperty('e');
      expect(expressionContext).not.isWritableProperty('f');
   });

   it('When creating expressions with shared identifiers, the expressions will be observed until all associated expressions have been released.', async () => {
      const expressionContext = {
         a: {
            b: {
               c: 10,
               d: 20,
            },
            e: 30
         },
         f: 40
      };

      const expression1 = jsParser.parse(expressionContext, 'a.b');
      await new WaitForEvent(expression1, 'changed').wait(emptyFunction);
      const expression2 = jsParser.parse(expressionContext, 'a.b');
      await new WaitForEvent(expression2, 'changed').wait(emptyFunction);
      const expression3 = jsParser.parse(expressionContext.a.b, 'c');
      await new WaitForEvent(expression3, 'changed').wait(emptyFunction);

      expect(expressionContext).isWritableProperty('a');
      expect(expressionContext.a).isWritableProperty('b');
      expect(expressionContext.a.b).isWritableProperty('c');
      expect(expressionContext.a.b).isWritableProperty('d');
      expect(expressionContext.a).not.isWritableProperty('e');
      expect(expressionContext).not.isWritableProperty('f');

      expression1.dispose();

      expect(expressionContext).isWritableProperty('a');
      expect(expressionContext.a).isWritableProperty('b');
      expect(expressionContext.a.b).isWritableProperty('c');
      expect(expressionContext.a.b).isWritableProperty('d');
      expect(expressionContext.a).not.isWritableProperty('e');
      expect(expressionContext).not.isWritableProperty('f');

      expression2.dispose();

      expect(expressionContext).not.isWritableProperty('a');
      expect(expressionContext.a).not.isWritableProperty('b');
      expect(expressionContext.a.b).isWritableProperty('c');
      expect(expressionContext.a.b).not.isWritableProperty('d');
      expect(expressionContext.a).not.isWritableProperty('e');
      expect(expressionContext).not.isWritableProperty('f');

      expression3.dispose();


      expect(expressionContext).not.isWritableProperty('a');
      expect(expressionContext.a).not.isWritableProperty('b');
      expect(expressionContext.a.b).not.isWritableProperty('c');
      expect(expressionContext.a.b).not.isWritableProperty('d');
      expect(expressionContext.a).not.isWritableProperty('e');
      expect(expressionContext).not.isWritableProperty('f');


   });
});
