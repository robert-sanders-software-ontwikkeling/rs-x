import { BehaviorSubject } from 'rxjs';

import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';

import { type IExpression } from '../../lib/expressions/expression-parser.interface';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { rsx } from '../../lib/rsx';

describe('AbstractExpression tests', () => {
  let expression: IExpression | undefined;

  beforeAll(async () => {
    await InjectionContainer.load(RsXExpressionParserModule);
  });

  afterAll(async () => {
    await unloadRsXExpressionParserModule();
  });

  afterEach(() => {
    expression?.dispose();
    expression = undefined;
  });

  it('evaluate with constant expression', async () => {
    const expression = rsx<number>('1 + 2')({});

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(3);
  });

  it('evaluate with identifier', async () => {
    const model = {
      a: 10,
      b: 20,
    };
    const expression = rsx<number>('a + b')(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(30);
  });

  it('expression with observable', async () => {
    const model = {
      observable: new BehaviorSubject<number>(50),
    };
    const expression = rsx<number>('observable + 1')(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(51);
    expect(actual).toBe(expression);
  });

  it('expression with promise', async () => {
    const model = {
      promise: Promise.resolve(100),
    };
    const expression = rsx<number>('promise + 1')(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(101);
    expect(actual).toBe(expression);
  });

  it('expression with map index', async () => {
    const model = {
      map: new Map<string, number>([
        ['one', 1],
        ['two', 2],
        ['three', 3],
      ]),
    };
    const expression = rsx<number>('map["three"]')(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(3);
    expect(actual).toBe(expression);
  });

  it('expression with array index', async () => {
    const model = {
      array: [11, 21, 31, 41, 51],
    };
    const expression = rsx<number>('array[1]')(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(21);
    expect(actual).toBe(expression);
  });

  it('will emit change event after changing identifier', async () => {
    const model = {
      a: 10,
      b: 20,
    };
    const expression = rsx<number>('a + b')(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.a = 200;
    })) as IExpression;

    expect(actual.value).toEqual(220);
    expect(actual).toBe(expression);
  });

  it('will emit change event after changing promise', async () => {
    const model = {
      promise: Promise.resolve(100),
    };
    const expression = rsx<number>('promise + 1')(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.promise = Promise.resolve(200);
    })) as IExpression;

    expect(actual.value).toEqual(201);
    expect(actual).toBe(expression);
  });

  it('will emit change event after changing observable', async () => {
    const model = {
      observable: new BehaviorSubject<number>(50),
    };
    const expression = rsx<number>('observable + 1')(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.observable.next(200);
    })) as IExpression;

    expect(actual.value).toEqual(201);
    expect(actual).toBe(expression);
  });

  it('will emit change event after replacing observable', async () => {
    const model = {
      observable: new BehaviorSubject<number>(50),
    };
    const expression = rsx<number>('observable + 1')(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.observable = new BehaviorSubject(300);
    })) as IExpression;

    expect(actual.value).toEqual(301);
    expect(actual).toBe(expression);
  });

  it('will emit change event when changing array', async () => {
    const model = {
      array: [11, 21, 31, 41, 51],
    };
    const expression = rsx<number>('array')(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.array.push(61);
    })) as IExpression;

    expect(actual.value).toEqual([11, 21, 31, 41, 51, 61]);
    expect(actual).toBe(expression);
  });

  it('will emit change event when changing map', async () => {
    const model = {
      map: new Map<string, number>([
        ['one', 1],
        ['two', 2],
        ['three', 3],
      ]),
    };
    const expression = rsx<number>('map')(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.map.set('four', 4);
    })) as IExpression;

    expect(actual.value).toDeepEqualCircular(
      new Map<string, number>([
        ['one', 1],
        ['two', 2],
        ['three', 3],
        ['four', 4],
      ]),
    );

    expect(actual).toBe(expression);
  });

  it('will emit change event when promise changes', async () => {
    const model = {
      a: {
        b: Promise.resolve(3),
      },
      c: 2,
    };

    const expression = rsx<number>('a.b + c')(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.a.b = Promise.resolve(4);
    })) as IExpression;

    expect(actual.value).toEqual(6);
    expect(actual).toBe(expression);
  });

  it('will emit change event when observable changes', async () => {
    const model = {
      a: {
        b: new BehaviorSubject(3),
      },
      c: 2,
    };
    const expression = rsx<number>('a.b + c')(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.a.b.next(4);
    })) as IExpression;

    expect(actual.value).toEqual(6);
    expect(actual).toBe(expression);
  });

  it('does not update unrelated expressions when state references are replaced', async () => {
    const rows = [
      {
        a: 1,
        b: 2,
      },
      {
        a: 3,
        b: 4,
      },
    ];

    const model = {
      rows: Promise.resolve(rows),
      selected: null as { a: number; b: number } | null,
    };

    const selectedExpression = rsx<{ a: number; b: number } | null>('selected')(
      model,
    );
    const row1Expression = rsx<number>('a + b')(rows[0]);
    const row2Expression = rsx<number>('a + b')(rows[1]);

    await new WaitForEvent(selectedExpression, 'changed', {
      ignoreInitialValue: true,
    }).wait(emptyFunction);
    await new WaitForEvent(row1Expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(emptyFunction);
    await new WaitForEvent(row2Expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(emptyFunction);

    let row1ExpressionChangeCount = 0;
    let row2ExpressionChangeCount = 0;
    let selectedChangeCount = 0;

    row1Expression.changed.subscribe(() => {
      row1ExpressionChangeCount++;
    });

    row2Expression.changed.subscribe(() => {
      row2ExpressionChangeCount++;
    });

    selectedExpression.changed.subscribe(() => {
      selectedChangeCount++;
    });

    await new WaitForEvent(selectedExpression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.selected = rows[0];
    });

    await new WaitForEvent(selectedExpression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.selected = rows[1]; // this will now trigger (1) and (2) while it should only trigger (2)
    });

    expect(row1ExpressionChangeCount).toEqual(1);
    expect(row2ExpressionChangeCount).toEqual(1);
    expect(selectedChangeCount).toEqual(3);
  });
});
