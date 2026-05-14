import {
  type IExpressionFactory,
  type IExpressionManager,
  rsx,
} from '@rs-x/expression-parser';

interface Model {
  a: number;
  b: number;
}

declare const model: Model;
declare const factory: IExpressionFactory;
declare const expressionManager: IExpressionManager;

rsx('a + b', { preparse: false, compiled: false, lazy: true })(model);
rsx('a - b', {
  preparse: false,
  compiled: false,
  lazyGroup: 'invalid',
})(model);
rsx('a + b + 1', {
  compiled: true,
  lazy: true,
  lazyGroup: 'duplicate',
})(model);
rsx('a * b', { preparse: true, lazy: true })(model);
rsx('a + b * 2', { preparse: false, compiled: true, lazy: true })(model);
rsx('a - b * 2', {
  preparse: false,
  compiled: true,
  lazyGroup: 'validCompiled',
})(model);
rsx('a / b', { preparse: false })(model);
factory.create(model, 'a + b');
expressionManager.create(model).instance.create({
  expressionString: 'a + b',
  lazy: true,
});
