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
    b: 2,
    value: 100,
    setB(v: number) {
      this.b = v;
    },
  };

  const expression = expressionFactory.create(model, '(setB(value), b)');

  try {
    // Wait until the expression has been resolved (has a value)
    await new WaitForEvent(expression, 'changed').wait(emptyFunction);

    console.log(`Initial value of (setB(value), b)':`);
    expression.changed.subscribe((change) => {
      console.log(change.value);
    });

    console.log(
      `Value of '(setB(value)', b)' after changing 'value' to '200':`,
    );
    await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.value = 200;
    });

    console.log(`Value of '(setB(value)', b)' after changing 'b' to '300':`);
    await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      model.b = 300;
    });

    console.log(`Final value of '(setB(value), b)':`);
    console.log(expression.value);
  } finally {
    // Always dispose of expressions after use.
    expression.dispose();
  }
})();
