import { emptyFunction, InjectionContainer, printValue, WaitForEvent } from '@rs-x/core';
import {
    IExpressionFactory,
    RsXExpressionParserInjectionTokens,
    RsXExpressionParserModule
} from '@rs-x/expression-parser';


// Load the expression parser module into the injection container
InjectionContainer.load(RsXExpressionParserModule);
const expressionFactory: IExpressionFactory = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionFactory);

export const run = (async () => {
    const expressionContext = {
        a: {
            b: new Map([
                ['a', { c: { d: 1 } }],
                ['b', { c: { d: 2 } }]
            ])
        }
    };

    const expression = expressionFactory.create(expressionContext, `a.b['b'].c.d`);

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a.b['b'].c.d':`);
        expression.changed.subscribe((change) => {
            printValue(change.value);
        });

        console.log(`Value of 'a.b['b'].c.d' after changing 'a' to '{ b: new Map([['a', { c: { d: 11 } }], ['b', { c: { d: 21 } }]]) }':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionContext.a = {
                b: new Map([
                    ['a', { c: { d: 11 } }],
                    ['b', { c: { d: 21 } }]
                ])
            }
        });
     
        console.log(`Value of 'a.b['b'].c.d' after changing b['b'] to '{ c: { d: 120 } }':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionContext.a.b.set('b', { c: { d: 120 } });
        });

        console.log(`Value of 'a.b['b'].c.d' after changing b['b'].c to '{ d: 220 }':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { 
            expressionContext.a.b.get('b').c = { d: 220 }; 
        });

        console.log(`Value of 'a.b['b'].c.d' after changing b[1].c.d to '330':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { 
            expressionContext.a.b.get('b').c.d = 330; 
        });

        console.log(`Final value of 'a.b['b'].c.d':`)
        printValue(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();