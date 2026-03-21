import { rsx, type IExpressionFactory } from '@rs-x/expression-parser';

interface IUserStats {
  total: number;
}

interface IUser {
  name: string;
  stats(): IUserStats;
}

interface IModel {
  user: IUser;
  count: number;
}

declare const factory: IExpressionFactory;
declare const model: IModel;

rsx('user.na')(model);
rsx('user.stats().to')(model);
rsx('count +')(model);
factory.create(model, 'user.name');
