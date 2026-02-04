import {
  emptyFunction,
  InjectionContainer,
  printValue,
  WaitForEvent,
} from '@rs-x/core';
import {
  type IExpressionFactory,
  RsXExpressionParserInjectionTokens,
  RsXExpressionParserModule,
} from '@rs-x/expression-parser';

// Load the expression parser module into the injection container
InjectionContainer.load(RsXExpressionParserModule);
const expressionFactory: IExpressionFactory = InjectionContainer.get(
  RsXExpressionParserInjectionTokens.IExpressionFactory,
);

export const run = (async () => {
  const model = {
    x: 10,
    y: 20,
  };

  const expression = expressionFactory.create(model, '({ a: x, b: y })');

  try {
    // Wait until the expression has been resolved (has a value)
    await new WaitForEvent(expression, 'changed').wait(emptyFunction);

    console.log(`Initial value of '({ a: x, b: y })':`);
    expression.changed.subscribe((change) => {
      printValue(change.value);
    });

    console.log(`Value of '({ a: x, b: y })' after changing 'x' to '100':`);
    await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.x = 100;
    });

    console.log(`Value of '({ a: x, b: y })' after changing 'y' to '200':`);
    await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.y = 200;
    });

    console.log(`Final value of '({ a: x, b: y })':`);
    printValue(expression.value);
  } finally {
    // Always dispose of expressions after use.
    expression.dispose();
  }
})();
