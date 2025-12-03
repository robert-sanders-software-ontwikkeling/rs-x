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
        type: Date,
        a: new Date(),
    };

    const expression = expressionManager.create(expressionContext).instance.create('a instanceof type').instance;

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a instanceof type':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a instanceof type' after changing a to 'new Number(2)':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = Type.cast(new Number(2)); });

        console.log(`Value of 'a instanceof type' after changing type to 'Number':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.type = Type.cast(Number); });

        console.log(`Final value of 'a instanceof type':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();

