import { emptyFunction, InjectionContainer, printValue, WaitForEvent } from '@rs-x/core';
import {
    IExpressionManager,
    RsXExpressionParserInjectionTokens,
    RsXExpressionParserModule
} from '@rs-x/expression-parser';

// Load the expression parser module into the injection container
InjectionContainer.load(RsXExpressionParserModule);
const expressionManager: IExpressionManager = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionManager);

export const run = (async () => {
    const expressionContext = {
        a: {
            b: {
                c: 10
            }
        }
    };

    const expression = expressionManager.create(expressionContext).instance.create('a.b.c').instance;

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a.b.c':`)
        expression.changed.subscribe((change) => {
            printValue(change.value);
        });

        console.log(`Value of 'a.b.c' after changing a to '{b : {c: 20}}':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = { b: { c: 20 } }; });

        console.log(`Value of 'a.b.c' after changing b to '{c: 30}':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a.b = { c: 30 }; });

        console.log(`Value of 'a.b.c' after changing c to '40':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a.b.c = 40; });

        console.log(`Final value of 'a.b.c':`)
        printValue(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();

