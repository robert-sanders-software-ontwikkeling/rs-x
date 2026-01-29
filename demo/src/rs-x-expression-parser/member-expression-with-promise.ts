import { emptyFunction, InjectionContainer, printValue, WaitForEvent } from '@rs-x/core';
import {
    type IExpressionFactory,
    RsXExpressionParserInjectionTokens,
    RsXExpressionParserModule
} from '@rs-x/expression-parser';

// Load the expression parser module into the injection container
InjectionContainer.load(RsXExpressionParserModule);
const expressionFactory: IExpressionFactory = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionFactory);

export const run = (async () => {
    const expressionContext = {
        a: {
            b: Promise.resolve({
                c: Promise.resolve({
                    d: 20
                })
            })
        }
    };

    const expression = expressionFactory.create(expressionContext, `a.b.c.d`);

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a.b.c.d':`);
        expression.changed.subscribe((change) => {
            printValue(change.value);
        });

        console.log(`Value of 'a.b.c.d' after changing 'a' to '{ b: Promise.resolve({ c: Promise.resolve({ d: 200 }) }) }':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionContext.a =   { b: Promise.resolve({ c: Promise.resolve({ d: 200 }) }) };
        });

        console.log(`Final value of 'a.b.c.d':`);
        printValue(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();