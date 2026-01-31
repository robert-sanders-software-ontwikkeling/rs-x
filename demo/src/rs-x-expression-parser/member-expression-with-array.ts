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
  const expressionContext = {
    a: {
      b: [
        {
          c: {
            d: 10,
          },
        },
        {
          c: {
            d: 11,
          },
        },
      ],
    },
    x: { y: 1 },
  };

  const expression = expressionFactory.create(expressionContext, 'a.b[1].c.d');

  try {
    // Wait until the expression has been resolved (has a value)
    await new WaitForEvent(expression, 'changed').wait(emptyFunction);

    console.log(`Initial value of 'a.b[1].c.d':`);
    expression.changed.subscribe((change) => {
      printValue(change.value);
    });

    console.log(
      `Value of 'a.b.c' after changing 'a' to '{b: [{ c: { d: 100}},{ c: { d: 110}}}':`,
    );
    await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      expressionContext.a = {
        b: [
          {
            c: {
              d: 100,
            },
          },
          {
            c: {
              d: 110,
            },
          },
        ],
      };
    });

    console.log(
      `Value of 'a.b[1].c.d' after changing b[1] to '{ c: { d: 120}}':`,
    );
    await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      expressionContext.a.b[1] = {
        c: {
          d: 120,
        },
      };
    });

    console.log(`Value of 'a.b[1].c.d' after changing b[1].c to '{d: 220}':`);
    await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      expressionContext.a.b[1].c = { d: 220 };
    });

    console.log(`Value of 'a.b[1].c.d' after changing b[1].c.d to '330':`);
    await new WaitForEvent(expression, 'changed', {
      ignoreInitialValue: true,
    }).wait(() => {
      expressionContext.a.b[1].c.d = 330;
    });

    console.log(`Final value of 'a.b[1].c.d':`);
    printValue(expression.value);
  } finally {
    // Always dispose of expressions after use.
    expression.dispose();
  }
})();
