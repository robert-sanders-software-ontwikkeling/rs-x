import { emptyFunction, InjectionContainer, printValue, WaitForEvent } from '@rs-x/core';
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
        message: 'Hello',
        subject: 'Message',
        a: {
            b: {
                mail: (message: string, subject: string) => {
                    return  {
                        messageWithSubject: `message: ${message}, subject: ${subject}`
                    };

                }
            }
        }
    };

    const expression = expressionFactory.create(expressionContext, 'a.b.mail(message, subject).messageWithSubject');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a.b.mail(message, subject).messageWithSubject':`);
        expression.changed.subscribe((change) => {
            printValue(change.value);
        });

        console.log(`Value of 'a.b.mail(message, subject).messageWithSubject' after changing 'message' to 'hi'`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionContext.message = 'hi';
        });

        console.log(`Value of 'a.b.mail(message, subject).messageWithSubject' after changing 'subject' to 'urgent message'`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionContext.subject  = 'urgent message';
        });

        console.log(`Final value of 'a.b.mail(message, subject).messageWithSubject':`);
        printValue(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();