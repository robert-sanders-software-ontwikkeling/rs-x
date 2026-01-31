import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionFactory } from '../../lib/expression-factory/expression-factory.interface';
import { type IExpression } from '../../lib/expressions/expression-parser.interface';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';

describe('Expression with expression reference', () => {
  let expressionFactory: IExpressionFactory;
  interface IItem {
    expression: IExpression<number>;
  }

  interface IModel {
    items: IItem[];
  }

  beforeAll(async () => {
    await InjectionContainer.load(RsXExpressionParserModule);
    expressionFactory = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionFactory,
    );
  });

  afterAll(async () => {
    await unloadRsXExpressionParserModule();
  });

  it('initial value', async () => {
    const item = { a: 1 };
    const itemExpression = expressionFactory.create<number>(item, 'a');
    const model: IModel = {
      items: [
        {
          expression: itemExpression,
        },
      ],
    };

    const expresion = expressionFactory.create<IItem[]>(model, 'items');

    await new WaitForEvent(expresion, 'changed').wait(emptyFunction);

    expect(expresion.value).toEqual(model.items);
  });
});
