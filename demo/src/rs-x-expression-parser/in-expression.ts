import { emptyFunction, InjectionContainer, Type, WaitForEvent } from '@rs-x/core';
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
        propertyName: 'hello',
        b: {
            hello: 'hi',
        },
    };

    const expression = expressionManager.create(expressionContext).instance.create('propertyName in b').instance;

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'propertyName in b':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'propertyName in b' after changing a to 'x':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.propertyName = 'x'; });

        console.log(`Value of 'propertyName in b' after changing b to '{x: 1}':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = Type.cast({ x: 1 }); });

        console.log(`Final value of 'propertyName in b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();

