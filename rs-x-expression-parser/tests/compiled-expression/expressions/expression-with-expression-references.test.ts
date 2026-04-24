process.env.RSX_EXPRESSION_ENGINE_MODE = 'compiled';

import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';

import { type IExpression } from '../../../lib/expressions/expression-parser.interface';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../../lib/rs-x-expression-parser.module';
import { rsx } from '../../../lib/rsx';

describe('Expression with expression reference', () => {
  let expression: IExpression;

  interface IItem {
    expression: IExpression<number>;
  }

  interface IModel {
    items: IItem[];
  }

  beforeAll(async () => {
    await InjectionContainer.load(RsXExpressionParserModule);
  });

  afterAll(async () => {
    await unloadRsXExpressionParserModule();
  });

  afterEach(() => {
    if (expression) {
      expression.dispose();
    }
  });
  it('initial value', async () => {
    const item = { a: 1 };
    const itemExpression = rsx<number>('a')(item);
    const model: IModel = {
      items: [
        {
          expression: itemExpression,
        },
      ],
    };

    expression = rsx<number>('items')(model);

    await new WaitForEvent(expression, 'changed').wait(emptyFunction);

    expect(expression.value).toEqual(model.items);
  });

  it('uses expression reference values as dependencies', async () => {
    const source = { rate: 0.15 };
    const rateExpression = rsx<number>('rate')(source);
    const model = {
      discountRate: rateExpression,
    };

    expression = rsx<string>('(discountRate * 100).toFixed(0) + "%"')(model);

    await new WaitForEvent(expression, 'changed').wait(emptyFunction);

    expect(expression.value).toEqual('15%');
  });

  it('updates when an expression reference dependency changes', async () => {
    const source = { rate: 0.15 };
    const rateExpression = rsx<number>('rate')(source);
    const model = {
      discountRate: rateExpression,
    };

    expression = rsx<string>('(discountRate * 100).toFixed(0) + "%"')(model);

    await new WaitForEvent(expression, 'changed').wait(emptyFunction);

    await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      source.rate = 0.25;
    });

    expect(expression.value).toEqual('25%');
  });
});
