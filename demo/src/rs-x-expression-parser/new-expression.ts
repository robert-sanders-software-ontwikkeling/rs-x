import { emptyFunction, InjectionContainer, printValue, Type, WaitForEvent } from '@rs-x/core';
import {
    type IExpressionFactory,
    RsXExpressionParserInjectionTokens,
    RsXExpressionParserModule
} from '@rs-x/expression-parser';

// Load the expression parser module into the injection container
InjectionContainer.load(RsXExpressionParserModule);
const expressionFactory: IExpressionFactory = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionFactory);

export const run = (async () => {
    class Value {
        constructor(public readonly value: number) { }
    }

    class Add10 {
        constructor(public readonly value: number) {
            this.value += 10;
        }
    }

    const expressionContext = {
        type: Value,
        value: 10,
    };

    const expression = expressionFactory.create(expressionContext, 'new type(value)');

    function print(instance: unknown): void {
        console.log(Type.getConstructorName(instance));
        printValue(instance);
    }

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'new type(value)':`);
        expression.changed.subscribe((change) => {
            print(change.value);
        });

        console.log(`Value of 'new type(value)' after changing 'value' to '20':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.value = 20; });

        console.log(`Value of 'new type(value)' after changing 'type' to 'Add10':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.type = Add10; });

        console.log(`Final value of 'new type(value)':`);
        print(expression.value);

    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();

