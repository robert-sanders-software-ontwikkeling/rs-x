import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
import {
  type IExpression,
  type IExpressionChangeHistory,
  type IExpressionChangeTracker,
  type IExpressionChangeTrackerManager,
  type IExpressionFactory,
  RsXExpressionParserInjectionTokens,
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '@rs-x/expression-parser';

interface IModel {
  a: number;
  b: number;
}

describe('ExpressionChangeTracker tests', () => {
  let expressionChangeTracker: IExpressionChangeTracker;
  let expressionChangeTrackerManager: IExpressionChangeTrackerManager;
  let expression: IExpression;
  let model: IModel;
  let expressionFactory: IExpressionFactory;

  beforeAll(async () => {
    await InjectionContainer.load(RsXExpressionParserModule);
    expressionFactory = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionFactory,
    );
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
      b: 30
    };

    expression = expressionFactory.create(model, 'a + b');

    await new WaitForEvent(expression, 'changed').wait(emptyFunction);

    // expressionChangeTracker = expressionChangeTrackerManager.create(expression).instance;
  });

  afterEach(() => {
    expression.dispose();
    expressionChangeTracker.dispose();
  });

  it('emit initial values', async () => {
    expressionChangeTracker =
      expressionChangeTrackerManager.create(expression).instance;

    const actual = await new WaitForEvent(expressionChangeTracker, 'changed').wait(
      emptyFunction,
    );

    const expected: IExpressionChangeHistory[] = [
      {
        expression: expression.childExpressions[0],
        value: 20,
        oldValue: undefined
      },
      {
        expression: expression.childExpressions[1],
        value: 30,
        oldValue: undefined
      },
      {
        expression: expression,
        value: 50,
        oldValue: undefined
      }

    ];

    expect(actual).toEqual(expected);
  });
});
