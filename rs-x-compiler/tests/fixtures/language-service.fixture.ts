import {
  rsx,
  type IExpression,
  type IExpressionFactory,
} from '@rs-x/expression-parser';

interface IUserStats {
  total: number;
}

interface IUser {
  name: string;
  stats(): IUserStats;
}

interface IModel {
  user: IUser;
  exprUser: IExpression<IUser>;
  exprCount: IExpression<number>;
  count: number;
  test(input: number, label?: string): Date;
  a: number;
  b: {
    c: number;
    d: number;
  };
}

declare const factory: IExpressionFactory;
declare const model: IModel;

rsx('user.na')(model);
rsx('exprUser.na')(model);
rsx('user.stats().to')(model);
rsx('exprCount + 1')(model);
rsx('count +')(model);
rsx('a > 10 ? b.c : b.d')(model);
rsx('a > 10 ? test(20) : b.c')(model);
rsx('a > 10 ? test(20, "x") : b.c')(model);
rsx(`user.na`)(model);
rsx(`a > 10 ? test(20) : new Date()`)(model);
rsx(`a > 10 ? test(20, 'x') : new Date()`)(model);
factory.create(model, 'user.name');
