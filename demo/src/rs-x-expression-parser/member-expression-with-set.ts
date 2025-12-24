import { emptyFunction, InjectionContainer, printValue, WaitForEvent } from '@rs-x/core';
import {
    IExpressionFactory,
    RsXExpressionParserInjectionTokens,
    RsXExpressionParserModule
} from '@rs-x/expression-parser';

// Load the expression parser module into the injection container
InjectionContainer.load(RsXExpressionParserModule);
const expressionFactory: IExpressionFactory = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionFactory);

export const run = (async () => {
    const expressionContext = {
        a: {
            b: new Set([1, 2])
        }
    };

    const expression = expressionFactory.create(expressionContext, `a.b`);

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a.b':`);
        expression.changed.subscribe((change) => {
            printValue(change.value);
        });

        console.log(`Value of 'a.b' after setting a to '{ b: new Set([10,20,30]) }'`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionContext.a = {
                b: new Set([10, 20, 30])
            };
        });

        console.log(`Value of 'a.b' after changing b to 'new Set([100, 200])':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionContext.a.b = new Set([100, 200]);
        });

        console.log(`Value of 'a.b' after adding 300 to b':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionContext.a.b.add(300);
        });

        console.log(`Value of 'a.b' after deleting 200 from b':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionContext.a.b.delete(200);
        });

        console.log(`Final value of 'a.b':`)
        printValue(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();