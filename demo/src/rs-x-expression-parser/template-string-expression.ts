import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        message: 'hi',
    };

    const expression = expressionFactory.create(expressionContext, '`Say ${message}`');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log("Initial value of '`Say ${message}`':");
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log("Value of '`Say ${message}`' after changing message a to 'hello':");
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.message = 'hello'; })

        console.log("Final value of '`Say ${message}`':")
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();

