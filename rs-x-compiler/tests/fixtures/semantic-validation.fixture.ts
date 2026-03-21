import { rsx, type IExpressionFactory } from '@rs-x/expression-parser';

interface Model {
  count: number;
  user: {
    name: string;
    multiplier(value: number): {
      total: number;
    };
  };
  multiply(a: number, b: number): number;
}

declare const model: Model;
declare const expressionFactory: IExpressionFactory;

// valid
rsx('count * 2')(model);
rsx('user.multiplier(2).total')(model);
expressionFactory.create(model, 'multiply(count, 2)');

// invalid identifier
rsx('missing')(model);

// invalid member
rsx('user.unknown')(model);

// invalid function argument type
rsx('user.multiplier("2").total')(model);

// invalid multiplication operands
rsx('user.name * 2')(model);

// invalid factory expression member after function
expressionFactory.create(model, 'user.multiplier(2).missingTotal');
