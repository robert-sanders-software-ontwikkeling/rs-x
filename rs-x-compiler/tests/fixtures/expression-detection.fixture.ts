import {
  type IExpression,
  type IExpressionFactory,
  RsXExpressionParserInjectionTokens,
  rsx,
} from '@rs-x/expression-parser';
import { InjectionContainer } from '@rs-x/core';

interface Model {
  a: number;
  b: {
    method(): {
      result: number;
    };
  };
}

declare const model: Model;
declare const dynamicExpression: string;

rsx('a + b.method().result')(model);
rsx(`a + b.method().result`)(model);
rsx('a + b.method().result', { preparse: false })(model);
rsx('a + b.method().result', { lazy: true })(model);
rsx('a + b.method().result', { compiled: false })(model);
rsx(dynamicExpression)(model);

declare const expressionFactory: IExpressionFactory;
expressionFactory.create(model, 'a + 1');
expressionFactory.create(model, `a + 1`);
expressionFactory.create(model, dynamicExpression);
const expressionFactoryFromDi = InjectionContainer.get<IExpressionFactory>(
  RsXExpressionParserInjectionTokens.IExpressionFactory,
);
expressionFactoryFromDi.create(model, 'a + 2');
InjectionContainer.get<IExpressionFactory>(
  RsXExpressionParserInjectionTokens.IExpressionFactory,
).create(model, 'b.method().result + 1');

declare function getFactory(): IExpressionFactory;
getFactory().create(model, 'b.method().result');

class CustomFactory implements IExpressionFactory {
  public create<T>(_context: object, _expression: string): IExpression<T> {
    return null as unknown as IExpression<T>;
  }
}

const customFactory = new CustomFactory();
customFactory.create(model, 'a');

const notAFactory = {
  create(_context: object, _expression: string): number {
    return 1;
  },
};

notAFactory.create(model, 'should-not-detect');
