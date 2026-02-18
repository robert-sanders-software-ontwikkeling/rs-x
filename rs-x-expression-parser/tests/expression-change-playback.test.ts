import { emptyFunction, InjectionContainer, WaitForEvent } from '../../rs-x-core/lib';
import {
  IExpression,
  IExpressionFactory,
  RsXExpressionParserInjectionTokens,
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule
} from '../lib';
import { IExpressionChangePlayback } from '../lib/expression-change-playback';
import { IExpressionChangeHistory } from '../lib/expression-change-tracker/expression-change-history.interface';
import { IExpressionChangeTracker, IExpressionChangeTrackerManager } from '../lib/expression-change-tracker/expression-change-tracker-manager.interface';

interface IModel {
  a: number;
  b: { c: number };
}

describe('ExpressionChangePlayback tests', () => {
  let expressionChangePlayback: IExpressionChangePlayback;
  let expressionChangeTracker: IExpressionChangeTracker;
  let expressionChangeTrackerManager: IExpressionChangeTrackerManager;
  let expression: IExpression;
  let model: IModel;
  let expressionFactory: IExpressionFactory;

  const setA = (value: number) => {
    return new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
      model.a = value;
    });
  };

  const setC = (value: number) => {
    return new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
      model.b.c = value;
    });
  };

  const resetToInitial = async () => {
    await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
      model.a = 20;
      model.b.c = 30;
    });
  };

  beforeAll(async () => {
    await InjectionContainer.load(RsXExpressionParserModule);
    expressionFactory = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionFactory);
    expressionChangePlayback = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionChangePlayback);
    expressionChangeTrackerManager = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionChangeTrackerManager);
  });

  afterAll(async () => {
    await unloadRsXExpressionParserModule();
  });

  beforeEach(async () => {
    model = {
      a: 20,
      b: { c: 30 }
    };

    expression = expressionFactory.create(model, 'a + b.c');

    await new WaitForEvent(expression, 'changed').wait(emptyFunction);

    expressionChangeTracker = expressionChangeTrackerManager.create(expression).instance;
  });

  afterEach(() => {
    expression.dispose();
    expressionChangeTracker.dispose();
  });


  it('play : set every change', async () => {
    const history = (await new WaitForEvent(expressionChangeTracker, 'changed', { count: 6 }).wait(async () => {
      await setA(21);
      await setA(30);
      await setA(35);
      await setC(100);
      await setC(99);
    })) as IExpressionChangeHistory[][];

    expect(history.length).toEqual(6);
    expect(expression.value).toEqual(134);

    expressionChangeTracker.dispose();
    await resetToInitial();
    expect(expression.value).toEqual(50);

    // t=0 -> 51
    await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
      expressionChangePlayback.play(1, history);
    });
    expect(expression.value).toEqual(51);

    // t=1 -> 60
    await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
      expressionChangePlayback.play(2, history);
    });
    expect(expression.value).toEqual(60);

    // t=2 -> 65
    await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
      expressionChangePlayback.play(3, history);
    });
    expect(expression.value).toEqual(65);

    // t=3 -> 135
    await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
      expressionChangePlayback.play(4, history);
    });
    expect(expression.value).toEqual(135);

    // t=4 -> 134
    await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
      expressionChangePlayback.play(5, history);
    });
    expect(expression.value).toEqual(134);
  });

 


});