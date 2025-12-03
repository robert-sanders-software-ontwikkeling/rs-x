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
        a: 5,
        b: 2
    };

    const expression = expressionManager.create(expressionContext).instance.create('a << b').instance;

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);
        
        console.log(`Initial value of 'a << b':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a << b' after changing a to '4':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 4; });

        console.log(`Value of 'a << b' after changing b to '3':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 3; });

        console.log(`Final value of 'a << b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


