import {
  type IExpression,
  type IExpressionFactory,
  rsx,
} from '@rs-x/expression-parser';

interface IUserStats {
  total: number;
}

interface IUser {
  name: string;
  stats(): IUserStats;
}

interface ICartItem {
  qty: number;
}

interface ICart {
  items: ICartItem[];
  first(): ICartItem | undefined;
}

interface IModel {
  user: IUser;
  lines: { qty: number; lineTotal: number }[];
  exprUser: IExpression<IUser>;
  exprCount: IExpression<number>;
  count: number;
  test(input: number, label?: string): Date;
  a: number;
  b: {
    c: number;
    d: number;
  };
  invoiceDate: Date;
  cart: ICart;
  cartItems: ICartItem[];
}

declare const factory: IExpressionFactory;
declare const model: IModel;
const sharedExpression = 'user.na';
const sharedValidExpression = 'user.name';
const sharedReduceExpression = 'lines.reduce((sum, line) => line.q, 0)';

rsx('user.na')(model);
rsx(sharedExpression)(model);
rsx(sharedValidExpression)(model);
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
rsx('invoiceDate.')(model);
rsx('invoiceDate.mo')(model);
rsx('cart.first().q')(model);
rsx('cart.items[0].')(model);
rsx('cart.items[0].q')(model);
rsx('cartItems[0].')(model);
rsx('cartItems[0].q')(model);
rsx('lines.reduce((sum, line) => sum + line.lineTotal, 0)')(model);
rsx('lines.reduce((sum, line) => sum.toF, 0)')(model);
rsx('lines.reduce((sum, line) => line.q, 0)')(model);
rsx(sharedReduceExpression)(model);
