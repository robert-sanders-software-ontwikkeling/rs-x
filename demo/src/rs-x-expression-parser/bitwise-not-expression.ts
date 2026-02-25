import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

// Load the expression parser module into the injection container
InjectionContainer.load(RsXExpressionParserModule);

export const run = (async () => {
  const model = {
    a: 5,
  };

  const expression = rsx<number>('~a')(model);

  try {
    // Wait until the expression has been resolved (has a value)
    await new WaitForEvent(expression, 'changed').wait(emptyFunction);

    console.log(`Initial value of '~a':`);
    expression.changed.subscribe((change) => {
      console.log(change.value);
    });

    console.log(`Value of ~a' after changing 'a' to '3':`);
    await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.a = 3;
    });

    console.log(`Final value of '~a':`);
    console.log(expression.value);
  } finally {
    // Always dispose of expressions after use.
    expression.dispose();
  }
})();
