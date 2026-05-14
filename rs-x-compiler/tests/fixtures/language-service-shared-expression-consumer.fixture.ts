import { rsx } from '@rs-x/expression-parser';

import {
  sharedImportedExpression,
  sharedImportedLambdaExpression,
  sharedImportedValidExpression,
} from './language-service-shared-expression.fixture';

interface IUser {
  name: string;
}

interface IModel {
  user: IUser;
  lines: { qty: number; lineTotal: number }[];
}

declare const model: IModel;

rsx(sharedImportedExpression)(model);
rsx(sharedImportedValidExpression)(model);
rsx(sharedImportedLambdaExpression)(model);
