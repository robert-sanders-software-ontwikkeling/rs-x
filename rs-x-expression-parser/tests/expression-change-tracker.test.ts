import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';

import { type IExpressionChangeHistory } from '../lib/expression-change-tracker/expression-change-history.interface';
import {
  type IExpressionChangeTracker,
  type IExpressionChangeTrackerManager,
} from '../lib/expression-change-tracker/expression-change-tracker-manager.interface';
import { type IExpression } from '../lib/expressions/expression-parser.interface';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../lib/rs-x-expression-parser-injection-tokes';
import { rsx } from '../lib/rsx';

interface IModel {
  a: number;
  b: number;
}

describe('ExpressionChangeTracker tests', () => {
  let expressionChangeTracker: IExpressionChangeTracker;
  let expressionChangeTrackerManager: IExpressionChangeTrackerManager;
  let expression: IExpression;
  let model: IModel;

  beforeAll(async () => {
    await InjectionContainer.load(RsXExpressionParserModule);
    expressionChangeTrackerManager = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionChangeTrackerManager,
    );
  });

  afterAll(async () => {
    await unloadRsXExpressionParserModule();
  });

  beforeEach(async () => {
    model = {
      a: 20,
      b: 30,
    };

    expression = rsx`a + b`(model);

    await new WaitForEvent(expression, 'changed').wait(emptyFunction);
  });

  afterEach(() => {
    expression.dispose();
    expressionChangeTracker.dispose();
  });

  it('emit initial values', async () => {
    expressionChangeTracker =
      expressionChangeTrackerManager.create(expression).instance;

    const actual = await new WaitForEvent(
      expressionChangeTracker,
      'changed',
    ).wait(emptyFunction);

    const expected: IExpressionChangeHistory[] = [
      {
        expression: expression.childExpressions[0],
        value: 20,
        oldValue: undefined,
      },
      {
        expression: expression.childExpressions[1],
        value: 30,
        oldValue: undefined,
      },
      {
        expression: expression,
        value: 50,
        oldValue: undefined,
      },
    ];

    expect(actual).toEqual(expected);
  });
});
