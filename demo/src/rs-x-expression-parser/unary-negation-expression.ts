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
  const expressionContext = {
    value: 1,
  };

  const expression = expressionFactory.create(expressionContext, '-value');

  try {
    // Wait until the expression has been resolved (has a value)
    await new WaitForEvent(expression, 'changed').wait(emptyFunction);

    console.log(`Initial value of '-value':`);
    expression.changed.subscribe((change) => {
      console.log(change.value);
    });

    console.log(`Value of '-value' after changing 'value' to '-5':`);
    await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      expressionContext.value = -5;
    });

    console.log(`Final value of '-value':`);
    console.log(expression.value);
  } finally {
    // Always dispose of expressions after use.
    expression.dispose();
  }
})();
