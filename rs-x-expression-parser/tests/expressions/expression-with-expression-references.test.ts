import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';

import { type IExpression } from '../../lib/expressions/expression-parser.interface';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { rsx } from '../../lib/rsx';

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
});
