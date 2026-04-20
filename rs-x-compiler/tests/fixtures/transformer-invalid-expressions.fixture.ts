import { rsx } from '@rs-x/expression-parser';

interface IModel {
  a: number;
}

const model: IModel = { a: 1 };

rsx('missing + 1')(model);
