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
        index: 0,
        a: ['1', 1],
    };

    const expression = expressionFactory.create(expressionContext, 'typeof a[index]');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'typeof a[index]':`);
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'typeof a[index]' after changing 'index' to '1':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.index = 1; })

        console.log(`Final value of 'typeof a[index]':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();

