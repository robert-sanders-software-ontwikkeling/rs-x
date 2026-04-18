import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { effectScope, nextTick } from 'vue';

import { InjectionContainer, UnsupportedException } from '@rs-x/core';
import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

import { useRsxExpression } from '../hooks/use-rsx-expression';
import { useRsxModel } from '../hooks/use-rsx-model';

describe('useRsxModel (Vue)', () => {
  beforeEach(() => {
    InjectionContainer.load(RsXExpressionParserModule);
  });

  afterEach(() => {
    InjectionContainer.unload(RsXExpressionParserModule);
  });

  it('binds scalar and nested object fields and updates when the model changes', async () => {
    const model = {
      price: 100,
      quantity: 2,
      user: {
        name: 'Alice',
      },
    };

    const scope = effectScope();
    let values:
      | {
          price: number | null;
          quantity: number | null;
          user: {
            name: string | null;
          };
        }
      | undefined;

    scope.run(() => {
      values = useRsxModel(model);
    });

    await nextTick();
    expect(values?.price).toBe(100);
    expect(values?.quantity).toBe(2);
    expect(values?.user.name).toBe('Alice');

    model.price = 150;
    model.user.name = 'Bob';
    await nextTick();

    expect(values?.price).toBe(150);
    expect(values?.user.name).toBe('Bob');

    scope.stop();
  });

  it('returns the same model object instance', () => {
    const model = {
      price: 100,
      quantity: 2,
    };

    const scope = effectScope();
    let returnedModel: typeof model | undefined;

    scope.run(() => {
      returnedModel = useRsxModel(model);
    });

    expect(returnedModel).toBe(model);

    scope.stop();
  });

  it('lets the returned model update the original rs-x model', async () => {
    const model = {
      price: 100,
      quantity: 2,
    };

    const scope = effectScope();
    let values:
      | {
          price: number | null;
          quantity: number | null;
        }
      | undefined;

    scope.run(() => {
      values = useRsxModel(model);
    });

    await nextTick();
    expect(values?.price).toBe(100);

    if (values) {
      values.price = 125;
      values.quantity = 4;
    }

    await nextTick();

    expect(model.price).toBe(125);
    expect(model.quantity).toBe(4);
    expect(values?.price).toBe(125);
    expect(values?.quantity).toBe(4);

    scope.stop();
  });

  it('supports filtering which fields are tracked', async () => {
    const model = {
      price: 100,
      quantity: 2,
    };

    const scope = effectScope();
    let values:
      | {
          price: number | null;
        }
      | undefined;

    scope.run(() => {
      values = useRsxModel(model, (_, field) => field === 'price');
    });

    await nextTick();
    expect(values?.price).toBe(100);
    expect(values?.quantity).toBe(2);

    model.price = 120;
    await nextTick();

    expect(values?.price).toBe(120);

    scope.stop();
  });

  it('supports building a new expression from the bound model', async () => {
    const model = {
      price: 100,
      quantity: 2,
    };

    const scope = effectScope();
    let boundModel:
      | {
          price: number | null;
          quantity: number | null;
        }
      | undefined;
    let total: ReturnType<typeof useRsxExpression<number>> | undefined;

    scope.run(() => {
      boundModel = useRsxModel(model);
      const totalExpr = rsx<number>('price * quantity')(boundModel!);
      total = useRsxExpression(totalExpr);
    });

    await nextTick();
    expect(total?.value).toBe(200);

    if (boundModel) {
      boundModel.price = 150;
      boundModel.quantity = 4;
    }

    await nextTick();

    expect(total?.value).toBe(600);

    scope.stop();
  });

  it('keeps a pre-built expression in sync when the same model is passed through useRsxModel', async () => {
    const sourceModel = {
      price: 100,
      quantity: 2,
    };
    const totalExpr = rsx<number>('price * quantity')(sourceModel);

    const scope = effectScope();
    let model:
      | {
          price: number | null;
          quantity: number | null;
        }
      | undefined;
    let total: ReturnType<typeof useRsxExpression<number>> | undefined;

    scope.run(() => {
      model = useRsxModel(sourceModel);
      total = useRsxExpression(totalExpr);
    });

    await nextTick();
    expect(total?.value).toBe(200);

    if (model) {
      model.price = 150;
      model.quantity = 4;
    }

    await nextTick();

    expect(total?.value).toBe(600);

    totalExpr.dispose();
    scope.stop();
  });

  it('does not require using the return value from useRsxModel', async () => {
    const model = {
      price: 100,
      quantity: 2,
    };
    const totalExpr = rsx<number>('price * quantity')(model);

    const scope = effectScope();
    let total: ReturnType<typeof useRsxExpression<number>> | undefined;

    scope.run(() => {
      useRsxModel(model);
      total = useRsxExpression(totalExpr);
    });

    await nextTick();
    expect(total?.value).toBe(200);

    model.price = 150;
    model.quantity = 4;

    await nextTick();

    expect(total?.value).toBe(600);

    totalExpr.dispose();
    scope.stop();
  });

  it('throws for collections for now', () => {
    const model = {
      items: ['a', 'b'],
    };

    const scope = effectScope();

    expect(() =>
      scope.run(() => {
        useRsxModel(model);
      }),
    ).toThrowError(UnsupportedException);

    scope.stop();
  });
});
