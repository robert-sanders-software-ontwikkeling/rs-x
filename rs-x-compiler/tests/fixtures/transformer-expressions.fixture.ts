import { rsx, type IExpressionFactory } from '@rs-x/expression-parser';

interface IModel {
  a: number;
  b: number;
}

declare const factory: IExpressionFactory;

const model: IModel = { a: 1, b: 2 };

rsx('a + b')(model);
factory.create(model, 'a * b');
