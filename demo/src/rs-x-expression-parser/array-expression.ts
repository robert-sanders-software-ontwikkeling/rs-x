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
        a: 3,
        array: [1, 2]
    };

    const expression = expressionManager.create(expressionContext).instance.create('[a, ...array, 100]').instance;

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of '[a, ...array, 100]':`)
        expression.changed.subscribe((change) => {
            printValue(change.value);
        });

        console.log(`Value of [a, ...array, 100]' after changing a to '6':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 6; });

        console.log(`Value of '[a, ...array, 100]' after changing array to '[1, 2, 3]':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.array.push(3); });

        console.log(`Value of '[a, ...array, 100]' after setting array to '[100, 200]':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.array = [100, 200]; });

        console.log(`Final value of '[a, ...array, 100]':`)
        printValue(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();