declare module '*.scss';
declare module '*.css';
declare module '*.html';

declare module '*.rsx' {
  import type { IExpression } from '@rs-x/expression-parser';
  import type { IIndexWatchRule } from '@rs-x/state-manager';

  const createRsxExpression: <TModel extends object = object>(
    model: TModel,
    leafIndexWatchRule?: IIndexWatchRule,
  ) => IExpression<unknown>;

  export default createRsxExpression;
}
