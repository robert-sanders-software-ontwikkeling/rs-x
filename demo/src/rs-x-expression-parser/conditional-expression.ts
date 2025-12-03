import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: 1,
        b: 2,
        c: 100,
        d: 200
    };

    const expression = expressionManager.create(expressionContext).instance.create('a > b ? c : d').instance;

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a > b ? c : d':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a > b ? c : d' after changing d to '300':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.d = 300; });

        console.log(`Value of 'a > b ? c : d' after changing a to '3':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 3; });

        console.log(`Value of 'a > b ? c : d' after changing c to '2000':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.c = 2000; });

        console.log(`Value of 'a > b ? c : d' after changing b to '4':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 4; });

        console.log(`Final value of 'a > b ? c : d':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();

