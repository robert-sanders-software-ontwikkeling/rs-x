import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
    a: 5,
    b: 2,
  };

  const expression = expressionFactory.create(model, 'a >> b');

  try {
    // Wait until the expression has been resolved (has a value)
    await new WaitForEvent(expression, 'changed').wait(emptyFunction);

    console.log(`Initial value of 'a >> b':`);
    expression.changed.subscribe((change) => {
      console.log(change.value);
    });

    console.log(`Value of 'a >> b' after changing 'a' to '10':`);
    await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.a = 10;
    });

    console.log(`Value of 'a >> b' after changing 'b' to '3':`);
    await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.b = 3;
    });

    console.log(`Final value of 'a >> b':`);
    console.log(expression.value);
  } finally {
    // Always dispose of expressions after use.
    expression.dispose();
  }
})();
