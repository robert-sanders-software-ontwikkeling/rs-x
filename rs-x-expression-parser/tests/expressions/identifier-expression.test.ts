import { InjectionContainer, WaitForEvent } from '@rs-x/core';
import {
  type IStateManager,
  RsXStateManagerInjectionTokens,
} from '@rs-x/state-manager';

import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import {
  ExpressionType,
  type IExpression,
} from '../../lib/expressions/expression-parser.interface';
import { IdentifierExpression } from '../../lib/expressions/identifier-expression';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';
import { rsx } from '../../lib/rsx';

describe('IdentifierExpression tests', () => {
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

  it('type', () => {
    const model = { a: 1 };
    expression = rsx('a')(model);

    expect(expression.type).toEqual(ExpressionType.Identifier);
  });

  it('clone', async () => {
    const services: IExpressionServices = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionServices,
    );
    const model = { a: 1 };
    expression = rsx('a')(model);

    const clonedExpression = expression.clone();

    try {
      expect(clonedExpression).toBeInstanceOf(IdentifierExpression);
      expect(clonedExpression.type).toEqual(ExpressionType.Identifier);
      expect(clonedExpression.expressionString).toEqual('a');

      await new WaitForEvent(clonedExpression, 'changed').wait(() => {
        clonedExpression.bind({
          context: model,
          services,
        });

        services.transactionManager.commit();
      });
      expect(clonedExpression.value).toEqual(1);
    } finally {
      clonedExpression.dispose();
    }
  });

  it('will emit change event for initial value', async () => {
    const model = { a: 1 };
    expression = rsx('a')(model);

    const actual = (await new WaitForEvent(expression, 'changed').wait(
      () => {},
    )) as IExpression;

    expect(actual.value).toEqual(1);
    expect(actual).toBe(expression);
  });

  it('will emit change event when identifier value changes', async () => {
    const model = { a: 1 };
    expression = rsx('a')(model);

    // Wait till the expression has been initialized before changing value
    await new WaitForEvent(expression, 'changed').wait(() => {});

    const actual = (await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.a = 100;
    })) as IExpression;

    expect(actual.value).toEqual(100);
    expect(actual).toBe(expression);
  });

  it('will emit change event for readonly getter-only property backed by stateManager', async () => {
    const stateManager: IStateManager = InjectionContainer.get(
      RsXStateManagerInjectionTokens.IStateManager,
    );

    class Model {
      private readonly _aPlusBId = 'aPlusB';
      private _a = 1;
      private _b = 2;

      public constructor() {
        this.setAPlusB();
      }

      public dispose(): void {
        stateManager.releaseState(this, this._aPlusBId);
      }

      public get aPlusB(): number {
        return stateManager.getState<number>(this, this._aPlusBId);
      }

      public get a(): number {
        return this._a;
      }

      public set a(value: number) {
        this._a = value;
        this.setAPlusB();
      }

      public get b(): number {
        return this._b;
      }

      public set b(value: number) {
        this._b = value;
        this.setAPlusB();
      }

      private setAPlusB(): void {
        stateManager.setState(this, this._aPlusBId, this._a + this._b);
      }
    }

    const model = new Model();

    try {
      expression = rsx('aPlusB')(model);

      await new WaitForEvent(expression, 'changed').wait(() => {});

      const actual = (await new WaitForEvent(expression, 'changed', {
        ignoreInitialValue: true,
      }).wait(() => {
        model.a = 10;
      })) as IExpression;

      expect(actual).toBe(expression);
      expect(expression.value).toEqual(12);
    } finally {
      model.dispose();
    }
  });
});
