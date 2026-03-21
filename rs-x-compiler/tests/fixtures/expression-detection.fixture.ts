import { rsx, type IExpression, type IExpressionFactory } from '@rs-x/expression-parser';

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
rsx(dynamicExpression)(model);

declare const expressionFactory: IExpressionFactory;
expressionFactory.create(model, 'a + 1');
expressionFactory.create(model, dynamicExpression);

declare function getFactory(): IExpressionFactory;
getFactory().create(model, 'b.method().result');

class CustomFactory implements IExpressionFactory {
  public create<T>(context: object, expression: string): IExpression<T> {
    return null as unknown as IExpression<T>;
  }
}

const customFactory = new CustomFactory();
customFactory.create(model, 'a');

const notAFactory = {
  create(context: object, expression: string): number {
    return 1;
  },
};

notAFactory.create(model, 'should-not-detect');
