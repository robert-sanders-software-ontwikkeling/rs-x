import {
  rsx,
  type IExpression,
  type IExpressionFactory,
} from '@rs-x/expression-parser';

interface Model {
  count: number;
  items: number[];
  lookup: Record<string, number>;
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
declare const modularModel: {
  x1: IExpression<number>;
  x2: IExpression<string>;
  xObj: IExpression<{ total: number }>;
};

// valid
rsx('count * 2')(model);
rsx('(count + 2) * 3')(model);
rsx('user.name + "!"')(model);
rsx('user.multiplier(2).total')(model);
rsx('items[1]')(model);
rsx('lookup["a"]')(model);
expressionFactory.create(model, 'multiply(count, 2)');
rsx('x1 * 3')(modularModel);
rsx('xObj.total * 2')(modularModel);

// invalid identifier
rsx('missing')(model);

// invalid member
rsx('user.unknown')(model);

// invalid function argument type
rsx('user.multiplier("2").total')(model);

// invalid multiplication operands
rsx('user.name * 2')(model);
rsx('count + true')(model);
rsx('+user.name')(model);
rsx('count - user.name')(model);
rsx('x2 * 3')(modularModel);

// invalid factory expression member after function
expressionFactory.create(model, 'user.multiplier(2).missingTotal');

// valid globals from GlobalIdentifierOwnerResolver
rsx('new Date()')(model);
