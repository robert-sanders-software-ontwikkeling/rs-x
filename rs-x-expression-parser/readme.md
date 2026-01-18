# Expression parser

The **JavaScript Expression Parser** translates a JavaScript expression string into an **observable expression tree**. Expressions are not only reactive, but also **composable**, allowing complex logic to be built from smaller, reusable expression units. In addition, you no longer need to worry about asynchronous data: it can be used as if it were **synchronous**. The RS-X framework automatically takes care of resolving and tracking async values.

Besides this, expressions can also invoke **methods**. The only assumption made is that these methods are **pure**—meaning that if the input arguments change, the return value will also change, and no hidden side effects are introduced. This guarantees predictable reactivity and correct change propagation.

Each identifier used inside an expression is automatically registered with the **State Manager**, enabling fine-grained change detection and highly efficient updates. Identifiers are resolved via an **Identifier Owner Resolver** service, which can be replaced with a custom implementation to adapt resolution behavior to different architectures or domains.

Because expressions themselves can be referenced by other expressions, the parser supports **true modularity**. Simple expressions can be combined, nested, and reused to form larger expression graphs, with changes propagating automatically across expression boundaries.

This parser forms the core of the **data-binding implementation** for the SPA framework and allows **synchronous and asynchronous data** (such as observables) to be mixed transparently, while ensuring that only the affected parts of the expression tree—and ultimately the UI—are updated.

### Examples

- **Expression with a promise** — ``promise + 2`` (where `promise` resolves to a number)
- **Expression with an observable** - ``observable + 2`` (where `observable` emits a number)
- **Expression referencing nested async data**

    ```ts
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
                b: Promise.resolve({
                    c: Promise.resolve({
                        d: 20
                    })
                })
            }
        };

        const expression = expressionFactory.create(expressionContext, `a.b.c.d`);

        try {
            // Wait until the expression has been resolved (has a value)
            await new WaitForEvent(expression, 'changed').wait(emptyFunction);

            console.log(`Initial value of 'a.b.c.d':`);
            expression.changed.subscribe((change) => {
                printValue(change.value);
            });

            console.log(`Value of 'a.b.c.d' after changing 'a' to '{ b: Promise.resolve({ c: Promise.resolve({ d: 200 }) }) }':`);
            await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
                expressionContext.a =   { b: Promise.resolve({ c: Promise.resolve({ d: 200 }) }) };
            });

            console.log(`Final value of 'a.b.c.d':`)
            printValue(expression.value);
        } finally {
            // Always dispose of expressions after use.
            expression.dispose();
        }
    })();
    ```

- **Modular expressions** — expressions can reference other expressions:

    ```ts
    const model = {
        a: 10,
        b: 20
    };

    const expr1 = expressionFactory.create(model, '(a + 1)');
    const expr2 = expressionFactory.create(model, '(b + 2)');

    const modularModel = {
        expr1,
        expr2
    };

    const expr3 = expressionFactory.create(modularModel, 'expr1 * expr2');
    ```

## Use cases

**Data binding for SPA frameworks and change detection** is the primary reason the expression parser was developed. However, it is a generic solution and can be used in any scenario where actions need to be triggered when data or an expression changes. Below are a few example use cases:

- **Logging and alert conditions**  
  Trigger alerts based on runtime conditions:  
  - Monitoring systems
  - Health checks
  - Observability tools
  
- **UI logic outside data binding**  
  Declarative UI behavior without relying on a full framework.

- **Workflow and automation engines**  
  - CI/CD pipelines
  - Job schedulers
  - Business process automation
  
- **Game logic and simulation**  
  - AI decision trees
  - Ability unlock rules
  - Physics toggles
  
- **Spreadsheet-like calculations**  
  - Financial dashboards
  - Pricing calculators
  - Quotation systems
  - 
- **Validation engines**  
  Field validation based on the values of other fields.


## Modular Expressions

RS-X supports **modular expressions**, allowing expressions to reference **other expressions** as first-class values.

This enables you to:
- Compose complex calculations from smaller, reusable parts
- Share intermediate results across multiple expressions
- Improve readability, maintainability, and testability
- Improve performance by ensuring shared expressions are **evaluated only once**

Modular expressions are a core feature of the **JavaScript Expression Parser** and play an important role in scalable data-binding scenarios.

## Overview

Instead of defining one large expression, you can split logic into smaller expressions and combine them:

- Define **base expressions** for reusable logic
- Reference those expressions in **higher-level expressions**
- React automatically to changes anywhere in the dependency graph

Each expression remains **observable**, and changes propagate efficiently through the expression tree.

## Basic Example

```ts
const model = {
  a: 10,
  b: 20
};

const expr1 = expressionFactory.create(model, '(a + 1)');
const expr2 = expressionFactory.create(model, '(b + 2)');

const modularModel = {
  expr1,
  expr2
};

const expr3 = expressionFactory.create(modularModel, 'expr1 * expr2');
```

### Result

- `expr1` evaluates to `11`
- `expr2` evaluates to `22`
- `expr3` evaluates to `242`

When `a` or `b` changes:
- Only the affected expressions are recalculated
- Dependent expressions update automatically

## Reactive Behavior

Each expression exposes a `changed` event:

```ts
expr3.changed.subscribe(() => {
  console.log('New value:', expr3.value);
});
```

Changes to:
- `a`
- `b`
- `expr1`
- `expr2`

automatically propagate to `expr3`.

## Performance Benefits

Modular expressions are not only about structure — they also **improve performance**.

### Why?

- Each expression is evaluated **once**
- Dependent expressions reuse the cached result
- No duplicated computation for shared logic

This is especially important when:
- Expressions are computationally expensive
- Expressions depend on asynchronous or reactive data
- The same calculation is reused in multiple places (e.g. UI bindings)

## What Expressions Can Reference

Modular expression support is enabled by adding a **custom index accessor** and a **custom observer factory**, allowing expressions to treat **other expressions as first-class reactive values**.

This clearly illustrates the power of the expression parser: **new data types and reactive models can be seamlessly integrated** by extending the **State Manager** via plugins.

## Complex modular expression example 

To get a sense of how powerful **modular expressions** are, we will look at a more realistic example.  
We are going to create an expression that calculates **credit risk**.

First, we will show an implementation **without modular expressions**, followed by an implementation **using modular expressions**.

---

### Non-Modular example
```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
import {
    IExpressionFactory,
    RsXExpressionParserInjectionTokens,
    RsXExpressionParserModule
} from '@rs-x/expression-parser';
import { BehaviorSubject } from 'rxjs';

// Load the expression parser module into the injection container
InjectionContainer.load(RsXExpressionParserModule);
const expressionFactory: IExpressionFactory =
    InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionFactory);

export const run = (async () => {
    interface IRisk {
        volatilityIndex: number;
        recessionProbability: number;
    }

    const riskModel = {
        customer: {
            age: 42,
            income: 72000,
            employmentYears: 6
        },
        credit: {
            score: 680,
            outstandingDebt: 18000
        },
        market: {
            baseInterestRate: 0.035
        },
        risk: new BehaviorSubject<IRisk>({
            volatilityIndex: 0.28,
            recessionProbability: 0.12
        }),
        thresholds: {
            highRisk: 0.75,
            mediumRisk: 0.45
        }
    };

    const expressionString = `(
      (
        // =========================
        // Numeric risk score
        // =========================
        (
            // Base personal risk
            (
                (credit.score < 600 ? 0.4 : 0.1) +
                (credit.outstandingDebt / customer.income) * 0.6 -
                (customer.employmentYears * 0.03)
            )

            // Age-based risk adjustment
            +
            (
                customer.age < 25 ? 0.15 :
                customer.age < 35 ? 0.05 :
                customer.age < 55 ? 0.00 :
                0.08
            )

            // Market risk (async observable)
            +
            (
                (risk.volatilityIndex * 0.5) +
                (risk.recessionProbability * 0.5)
            )

            // Interest rate impact
            +
            (market.baseInterestRate * 2)
        )
        // =========================
        // Risk classification
        // =========================
        >= thresholds.highRisk
            ? 'HIGH'
            : (
                (
                    (
                        (credit.score < 600 ? 0.4 : 0.1) +
                        (credit.outstandingDebt / customer.income) * 0.6 -
                        (customer.employmentYears * 0.03)
                    )
                    +
                    (
                        customer.age < 25 ? 0.15 :
                        customer.age < 35 ? 0.05 :
                        customer.age < 55 ? 0.00 :
                        0.08
                    )
                    +
                    (
                        (risk.volatilityIndex * 0.5) +
                        (risk.recessionProbability * 0.5)
                    )
                    +
                    (market.baseInterestRate * 2)
                ) >= thresholds.mediumRisk
                ? 'MEDIUM'
                : 'LOW'
            )
        )
    )`;

    const expression = expressionFactory.create(riskModel, expressionString);

    console.log('Initial risk: ')
    const changeSubscription = expression.changed.subscribe(() => {
        console.log(expression.value);
    });

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log('Risk after changing risk parameters from  { volatilityIndex: 0.28, recessionProbability: 0.12 } to  { volatilityIndex: 0.41, recessionProbability: 0.35 } :')
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            riskModel.risk.next({
                volatilityIndex: 0.45,
                recessionProbability: 0.35
            })
        });

        console.log('Risk after change age = 63 and employmentYears = 1 ');

        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            riskModel.customer.age = 63;
            riskModel.customer.employmentYears = 1;
        });
    } finally {
        changeSubscription.unsubscribe();
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Modular example

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
import {
    IExpressionFactory,
    RsXExpressionParserInjectionTokens,
    RsXExpressionParserModule
} from '@rs-x/expression-parser';
import { BehaviorSubject } from 'rxjs';

// Load the expression parser module into the injection container
InjectionContainer.load(RsXExpressionParserModule);
const expressionFactory: IExpressionFactory =
    InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionFactory);


export const run = (async () => {
    interface IRisk {
        volatilityIndex: number;
        recessionProbability: number;
    }

    const riskModel = {
        customer: {
            age: 42,
            income: 72000,
            employmentYears: 6
        },
        credit: {
            score: 680,
            outstandingDebt: 18000
        },
        market: {
            baseInterestRate: 0.035
        },
        risk: new BehaviorSubject<IRisk>({
            volatilityIndex: 0.28,
            recessionProbability: 0.12
        }),
    };

    const basePersonalRisk = expressionFactory.create(riskModel, `
        (credit.score < 600 ? 0.4 : 0.1) +
        (credit.outstandingDebt / customer.income) * 0.6 -
        (customer.employmentYears * 0.03)     
    `);

    const ageBasedRiskAdjustment = expressionFactory.create(riskModel, `
        customer.age < 25 ? 0.15 :
        customer.age < 35 ? 0.05 :
        customer.age < 55 ? 0.00 :
        0.08
    `);

    const marketRisk = expressionFactory.create(riskModel, `
        (risk.volatilityIndex * 0.5) +
        (risk.recessionProbability * 0.5)
    `);

    const interestRateImpact = expressionFactory.create(riskModel, 'market.baseInterestRate * 2');

    const riskScoreModel = {
        basePersonalRisk,
        ageBasedRiskAdjustment,
        marketRisk,
        interestRateImpact
    };

    const riskScore = expressionFactory.create(riskScoreModel, `
        basePersonalRisk + 
        ageBasedRiskAdjustment +
        marketRisk + 
        interestRateImpact
    `);

    const riskClassificationModel = {
        riskScore,
        thresholds: {
            highRisk: 0.75,
            mediumRisk: 0.45
        }
    };

    const riskClassification = expressionFactory.create(riskClassificationModel, `
        riskScore >= thresholds.highRisk
            ? 'HIGH'
            : riskScore >= thresholds.mediumRisk
                ? 'MEDIUM'
                : 'LOW'
    `);


    console.log('Initial risk: ')
    const changeSubscription = riskClassification.changed.subscribe(() => {
        console.log(riskClassification.value);
    });

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(riskClassification, 'changed').wait(emptyFunction);

        console.log('Risk after changing risk parameters from  { volatilityIndex: 0.28, recessionProbability: 0.12 } to  { volatilityIndex: 0.41, recessionProbability: 0.35 } :')
        await new WaitForEvent(riskClassification, 'changed', { ignoreInitialValue: true }).wait(() => {
            riskModel.risk.next({
                volatilityIndex: 0.45,
                recessionProbability: 0.35
            })
        });

        console.log('Risk after change age = 63 and employmentYears = 1 ');

        await new WaitForEvent(riskClassification, 'changed', { ignoreInitialValue: true }).wait(() => {
            riskModel.customer.age = 63;
            riskModel.customer.employmentYears = 1;
        });

    } finally {
        changeSubscription.unsubscribe();
        // Always dispose of expressions after use.
        riskClassification.dispose();
        riskScore.dispose();
        interestRateImpact.dispose();
        marketRisk.dispose();
        ageBasedRiskAdjustment.dispose();
        basePersonalRisk.dispose();
    }
})();


```

### Limitations of the Non-Modular Implementation

We can observe the following issues in the non-modular implementation:

- The expression is quite long and difficult to read.
- Debugging is hard because the entire expression must be inspected as a single unit.
- The risk score calculation is duplicated, meaning it is evaluated **twice**, which makes the implementation less efficient.

---

### Improvements with Modular Expressions

With the modular implementation, we notice the following improvements:

- The expression is split into multiple smaller expressions, making it much more readable.
- Debugging becomes easier because each sub-expression can be tested and debugged independently.
- Code duplication is eliminated by reusing the risk score expression. This also means the risk score is calculated **only once**, improving performance.

## Summary

- Expressions can reference **other expressions**
- Modular expressions improve **clarity**, **reuse**, and **performance**
- Shared expressions are evaluated **once**
- Changes propagate efficiently through the expression tree
- Works seamlessly with synchronous and asynchronous data

Modular expressions form a powerful foundation for advanced data binding and reactive logic in RS-X.

## Get an instance of the Expression Parser Factory

The expression parser factory is registered as a **singleton service**.  
You must load the module into the injection container if you went
to use it.

```ts
import { InjectionContainer } from '@rs-x/core';
import {
    RsXExpressionParserInjectionTokens,
    RsXExpressionParserModule
} from '@rs-x/expression-parser';

InjectionContainer.load(RsXExpressionParserModule);
```

There are two ways to get an instance:

1. Using the injection container

    ```ts
    import { InjectionContainer } from '@rs-x/core';
    import {
        IExpressionFactory,
        RsXExpressionParserInjectionTokens,
        RsXExpressionParserModule
    } from '@rs-x/expression-parser';

    const expressionFactory: IExpressionFactory = InjectionContainer.get(
        RsXExpressionParserInjectionTokens.IExpressionFactory
    );
    ```

2. Using the `@Inject` decorator

    ```ts
    import { Inject } from '@rs-x/core';
    import {
        RsXExpressionParserInjectionTokens,
        RsXExpressionParserModule
    } from '@rs-x/expression-parser';

    export class MyClass {

        constructor(
            @Inject(RsXExpressionParserInjectionTokens.IExpressionFactory)
            private readonly _expressionFactory: IExpressionFactory
        ) {}
    }
    ```

## Resolving Identifier Owner

Expressions resolve to data values for there leaves. These values may be constants (such as numbers or strings), but more commonly they are stored as **indexes** within a given **context**. For example, when the context is an object instance, indexes refer to properties or fields; when the context is a `Map`, indexes refer to map keys.

The interface responsible for resolving the owner of an identifier is defined as follows:
```ts
export interface IIdentifierOwnerResolver {
    resolve(index: unknown, context: unknown): object | null;
}
```

The default resolution mechanism uses a list of identifier owner resolvers. Each resolver is evaluated in order until one returns a non-`null` context, which is then considered the owner of the identifier.

In `rs-x-expression-parser.module.ts`, the default resolver list is configured as shown below:

```ts
registerMultiInjectServices(
    options,
    RsXExpressionParserInjectionTokens.IIdentifierOwnerResolverList,
    [
        { target: PropertyOwnerResolver, token: RsXExpressionParserInjectionTokens.PropertyOwnerResolver },
        { target: ArrayIndexOwnerResolver, token: RsXExpressionParserInjectionTokens.ArrayIndexOwnerResolver },
        { target: MapKeyOwnerResolver, token: RsXExpressionParserInjectionTokens.MapKeyOwnerResolver },
    ]
);
```

The default configuration includes the following resolvers:

- **PropertyOwnerResolver**  
  Resolves the identifier if the specified index corresponds to a property or field on the provided context. Returns the context if resolved; otherwise, returns `null`.

- **ArrayIndexOwnerResolver**  
  Resolves the identifier if the context is an array and the specified index is a valid array index. Returns the context if resolved; otherwise, returns `null`.

- **MapKeyOwnerResolver**  
  Resolves the identifier if the context is a `Map` and the specified index exists as a key in that map. Returns the context if resolved; otherwise, returns `null`.

The default resolver list may be overridden by registering a custom list in a consuming module:
```ts
    overrideMultiInjectServices(
      options,
      RsXExpressionParserInjectionTokens.IIdentifierOwnerResolverList,
      CUSTOM_LIST
    );
```
A common use case for a custom resolver occurs during data binding. In such scenarios, the initial context is the HTML element on which the data-binding expression is declared, while the identifier may be defined on an ancestor element (for example, a custom element). In this case, the resolver must traverse the parent chain until an element defining the identifier is found. The resolved context is then that element.

This behavior can be implemented by providing a custom `IIdentifierOwnerResolver` that encapsulates the required traversal logic.


## Supported Expresssion types

All non-assignment JavaScript expressions are supported. These expressions can be combined to form more complex expressions. The following expressions are the basic supported expressions:

### Addition expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: 1,
        b: 3
    };

    const expression = expressionFactory.create(expressionContext, 'a + b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a + b':`);
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a + b' after changing 'a' to '6':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 6; })

        console.log(`Value of 'a + b' after changing 'b' to '4':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 4; })

        console.log(`Final value of 'a + b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Array expression

```ts
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
        a: 3,
        array: [1, 2]
    };

    const expression = expressionFactory.create(expressionContext, '[a, ...array, 100]');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of '[a, ...array, 100]':`)
        expression.changed.subscribe((change) => {
            printValue(change.value);
        });

        console.log(`Value of [a, ...array, 100]' after changing 'a' to '6':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 6; });

        console.log(`Value of '[a, ...array, 100]' after changing 'array' to '[1, 2, 3]':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.array.push(3); });

        console.log(`Value of '[a, ...array, 100]' after setting 'array' to '[100, 200]':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.array = [100, 200]; });

        console.log(`Final value of '[a, ...array, 100]':`)
        printValue(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();
```

### Bitwise and expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: 5,
        b: 3
    };

    const expression = expressionFactory.create(expressionContext, 'a & b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a & b':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a & b' after changing 'a' to '2':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 2; });

        console.log(`Value of 'a & b' after changing 'b' to '8':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 8; });

        console.log(`Final value of 'a & b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();

```

### Bitwise left shift expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: 5,
        b: 2
    };

    const expression = expressionFactory.create(expressionContext, 'a << b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a << b':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a << b' after changing 'a' to '4':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 4; });

        console.log(`Value of 'a << b' after changing 'b' to '3':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 3; });

        console.log(`Final value of 'a << b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();



```

### Bitwise not expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: 5,
    };

    const expression = expressionFactory.create(expressionContext, '~a');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of '~a':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of ~a' after changing 'a' to '3':`);
         await new WaitForEvent(expression, 'changed', {ignoreInitialValue: true}).wait(() => {expressionContext.a = 3;});

        console.log(`Final value of '~a':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();

```

### Bitwise or expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: 5,
        b: 2
    };

    const expression = expressionFactory.create(expressionContext, 'a | b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a | b':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a | b' after changing 'a' to '10':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 10; });

        console.log(`Value of 'a | b' after changing 'b' to '3':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 3; });

        console.log(`Final value of 'a | b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Bitwise right shift expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: 5,
        b: 2
    };

    const expression = expressionFactory.create(expressionContext, 'a >> b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a >> b':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a >> b' after changing 'a' to '10':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 10; });

        console.log(`Value of 'a >> b' after changing 'b' to '3':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 3; });

        console.log(`Final value of 'a >> b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Bitwise unsigned right shift expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: 5,
        b: 2
    };

    const expression = expressionFactory.create(expressionContext, 'a >>> b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a >>> b':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a >>> b' after changing 'a' to '-5':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = -5; });

        console.log(`Value of 'a >>> b' after changing 'b' to '3':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 3; });

        console.log(`Final value of 'a >>> b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Bitwise xor expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: 5,
        b: 3
    };

    const expression = expressionFactory.create(expressionContext, 'a ^ b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a ^ b':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a ^ b' after changing 'a' to '10':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 10; });

        console.log(`Value of 'a ^ b' after changing 'b' to '8':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 8; });

        console.log(`Final value of 'a ^ b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();

```

### Conditional expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: 1,
        b: 2,
        c: 100,
        d: 200
    };

    const expression = expressionFactory.create(expressionContext, 'a > b ? c : d');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a > b ? c : d':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a > b ? c : d' after changing d to '300':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.d = 300; });

        console.log(`Value of 'a > b ? c : d' after changing 'a' to '3':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 3; });

        console.log(`Value of 'a > b ? c : d' after changing c to '2000':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.c = 2000; });

        console.log(`Value of 'a > b ? c : d' after changing 'b' to '4':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 4; });

        console.log(`Final value of 'a > b ? c : d':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Division expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: 20,
        b: 2
    };

    const expression = expressionFactory.create(expressionContext, 'a / b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a / b':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a / b' after changing 'a' to '10':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 10; });

        console.log(`Value of 'a /b b' after changing 'b' to '2':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 2; });

        console.log(`Final value of 'a / b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Equality expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: 3,
        b: 2
    };

    const expression = expressionFactory.create(expressionContext, 'a == b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a == b':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a == b' after changing 'a' to '2':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 2; });

        console.log(`Value of 'a == b' after changing 'b' to '4':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 4; });

        console.log(`Final value of 'a == b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Exponentiation expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: 2,
        b: 3
    };

    const expression = expressionFactory.create(expressionContext, 'a ** b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a ** b':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a ** b' after changing 'a' to '4':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 4; });

        console.log(`Value of 'a ** b' after changing 'b' to '5':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 5; });

        console.log(`Final value of 'a ** b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Function expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: 2,
        b: 3,
        multiply(a: number, b: number) {
            return a * b;
        }
    };

    const expression = expressionFactory.create(expressionContext, 'multiply(a, b)');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'multiply(a, b)'`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'multiply(a, b)' after changing 'a' to '4':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 4; });

        console.log(`Value of 'mutiply(a, b)' after changing 'b' to '5':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 5; });

        console.log(`Final value of 'multiply(a, b)':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();

```

### Greater than expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: 3,
        b: 2
    };

    const expression = expressionFactory.create(expressionContext, 'a > b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a > b':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a > b' after changing 'a' to '2':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 2; });

        console.log(`Value of 'a > b' after changing 'b' to '1':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 1; });

        console.log(`Final value of 'a > b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Greater than or equal expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: 3,
        b: 2
    };

    const expression = expressionFactory.create(expressionContext, 'a >= b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a >= b':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a >= b' after changing 'a' to '1':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 1; });

        console.log(`Value of 'a >= b' after changing 'b' to '0':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 0; });

        console.log(`Final value of 'a >= b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### In expression

```ts
import { emptyFunction, InjectionContainer, Type, WaitForEvent } from '@rs-x/core';
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
        propertyName: 'hello',
        b: {
            hello: 'hi',
        },
    };

    const expression = expressionFactory.create(expressionContext, 'propertyName in b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'propertyName in b':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'propertyName in b' after changing 'a' to 'x':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.propertyName = 'x'; });

        console.log(`Value of 'propertyName in b' after changing 'b' to '{x: 1}':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = Type.cast({ x: 1 }); });

        console.log(`Final value of 'propertyName in b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Inequality expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: 1,
        b: 2
    };

    const expression = expressionFactory.create(expressionContext, 'a != b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a != b':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a != b' after changing 'a' to '2':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 2; });

        console.log(`Value of 'a != b' after changing 'b' to '2':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 2; });

        console.log(`Final value of 'a != b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Instanceof expression

```ts
import { emptyFunction, InjectionContainer, Type, WaitForEvent } from '@rs-x/core';
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
        type: Date,
        a: new Date(),
    };

    const expression = expressionFactory.create(expressionContext, 'a instanceof type');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a instanceof type':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a instanceof type' after changing 'a' to 'new Number(2)':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = Type.cast(new Number(2)); });

        console.log(`Value of 'a instanceof type' after changing 'type' to 'Number':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.type = Type.cast(Number); });

        console.log(`Final value of 'a instanceof type':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Less than expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: 2,
        b: 3
    };

    const expression = expressionFactory.create(expressionContext, 'a < b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a < b':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a < b' after changing 'a' to '3':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 3; });

        console.log(`Value of 'a < b' after changing 'b' to '4':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 4; });

        console.log(`Final value of 'a < b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Less than or equal expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: 2,
        b: 3
    };

    const expression = expressionFactory.create(expressionContext, 'a <= b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a <= b':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a <= b' after changing 'a' to '4':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 4; });

        console.log(`Value of 'a < b' after changing 'b' to '4':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 4; });

        console.log(`Final value of 'a <= b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Logical and expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: false,
        b: true
    };

    const expression = expressionFactory.create(expressionContext, 'a && b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a && b':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a && b' after changing 'a' to 'true':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = true; });

        console.log(`Value of 'a && b' after changing 'b' to 'false':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = false; });

        console.log(`Final value of 'a && b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();

```

### Logical not expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: false
    };

   const expression = expressionFactory.create(expressionContext, '!a');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of '!a':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of !a' after changing 'a' to 'true':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = true; });

        console.log(`Final value of '!a':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();
```

### Logical or expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: true,
        b: false
    };

    const expression = expressionFactory.create(expressionContext, 'a || b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a || b':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a || b' after changing 'a' to 'false':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = false; });

        console.log(`Value of 'a || b' after changing 'b' to 'true':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = true; });

        console.log(`Final value of 'a || b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Member expression

* Member expression
    ```ts
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
                b: {
                    c: 10
                }
            }
        };

        const expression = expressionFactory.create(expressionContext, 'a.b.c');

        try {
            // Wait until the expression has been resolved (has a value)
            await new WaitForEvent(expression, 'changed').wait(emptyFunction);

            console.log(`Initial value of 'a.b.c':`)
            expression.changed.subscribe((change) => {
                printValue(change.value);
            });

            console.log(`Value of 'a.b.c' after changing 'a' to '{b : {c: 20}}':`);
            await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = { b: { c: 20 } }; });

            console.log(`Value of 'a.b.c' after changing 'b' to '{c: 30}':`);
            await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a.b = { c: 30 }; });

            console.log(`Value of 'a.b.c' after changing c to '40':`);
            await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a.b.c = 40; });

            console.log(`Final value of 'a.b.c':`)
            printValue(expression.value);
        } finally {
            // Always dispose of expressions after use.
            expression.dispose();
        }
    })();


    ```
* Member expression with array
    ```ts
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
                b: [
                    {
                        c: {
                            d: 10
                        }
                    },
                    {
                        c: {
                            d: 11
                        }
                    },
                ]
            },
            x: { y: 1 }
        };

        const expression = expressionFactory.create(expressionContext, 'a.b[1].c.d');

        try {
            // Wait until the expression has been resolved (has a value)
            await new WaitForEvent(expression, 'changed').wait(emptyFunction);

            console.log(`Initial value of 'a.b[1].c.d':`);
            expression.changed.subscribe((change) => {
                printValue(change.value);
            });

            console.log(`Value of 'a.b.c' after changing 'a' to '{b: [{ c: { d: 100}},{ c: { d: 110}}}':`);
            await new WaitForEvent(expression, 'changed', {ignoreInitialValue: true}).wait(() => {
                expressionContext.a = {
                    b: [
                        {
                            c: {
                                d: 100
                            }
                        },
                        {
                            c: {
                                d: 110
                            }
                        },
                    ]
                };
            });

            console.log(`Value of 'a.b[1].c.d' after changing b[1] to '{ c: { d: 120}}':`);
            await new WaitForEvent(expression, 'changed', {ignoreInitialValue: true}).wait(() => {
                expressionContext.a.b[1] = {
                    c: {
                        d: 120
                    }
                };
            });

            console.log(`Value of 'a.b[1].c.d' after changing b[1].c to '{d: 220}':`);
            await new WaitForEvent(expression, 'changed', {ignoreInitialValue: true}).wait(() => { expressionContext.a.b[1].c = { d: 220 }; });

            console.log(`Value of 'a.b[1].c.d' after changing b[1].c.d to '330':`);
            await new WaitForEvent(expression, 'changed', {ignoreInitialValue: true}).wait(() => { expressionContext.a.b[1].c.d = 330; });

            console.log(`Final value of 'a.b[1].c.d':`)
            printValue(expression.value);
        } finally {
            // Always dispose of expressions after use.
            expression.dispose();
        }
    })();
    ```
* Member expression with map
    ```ts
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
    ```
* Member expression with method
    ```ts
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

            console.log(`Final value of 'a.b.mail(message, subject).messageWithSubject':`)
            printValue(expression.value);
        } finally {
            // Always dispose of expressions after use.
            expression.dispose();
        }
    })();
    ```
* Member expression with observable
    ```ts
    import { emptyFunction, InjectionContainer, printValue, WaitForEvent } from '@rs-x/core';
    import {
        IExpressionFactory,
        RsXExpressionParserInjectionTokens,
        RsXExpressionParserModule
    } from '@rs-x/expression-parser';
    import { BehaviorSubject } from 'rxjs';

    // Load the expression parser module into the injection container
    InjectionContainer.load(RsXExpressionParserModule);
    const expressionFactory: IExpressionFactory = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionFactory);

    export const run = (async () => {
        const nestedObservable = new BehaviorSubject({ d: 200 });
        const rootObservable = new BehaviorSubject({ c: nestedObservable });
        const expressionContext = {
            a: {
                b: new BehaviorSubject(
                    {
                        c: new BehaviorSubject({ d: 20 })
                    }
                )
            }
        };
        const expression = expressionFactory.create(expressionContext, `a.b.c.d`);

        try {
            // Wait until the expression has been resolved (has a value)
            await new WaitForEvent(expression, 'changed').wait(emptyFunction);

            console.log(`Initial value of 'a.b.c.d':`);
            expression.changed.subscribe((change) => {
                printValue(change.value);
            });


            console.log(`Value of 'a.b.c.d' after changing 'a' to '{ b: BehaviorSubject({ c: BehaviorSubject({ d: 200 }) }) }':`);
            await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
                expressionContext.a = { b: rootObservable }

            });

            console.log(`Value of 'a.b.c.d' after emitting a new value '{ d: 300 }' for c':`);
            await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
                nestedObservable.next({ d: 300 });
            });

            console.log(`Value of 'a.b.c.d' after emitting a new value '{ c: new BehaviorSubject({ d: 400 }) }' for b':`);
            await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
                rootObservable.next({
                    c: new BehaviorSubject({ d: 400 })
                })
            });

            console.log(`Final value of 'a.b.c.d':`)
            printValue(expression.value);
        } finally {
            // Always dispose of expressions after use.
            expression.dispose();
        }
    })();
    ```
* Member expression with promise
    ```ts
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
                b: Promise.resolve({
                    c: Promise.resolve({
                        d: 20
                    })
                })
            }
        };

        const expression = expressionFactory.create(expressionContext, `a.b.c.d`);

        try {
            // Wait until the expression has been resolved (has a value)
            await new WaitForEvent(expression, 'changed').wait(emptyFunction);

            console.log(`Initial value of 'a.b.c.d':`);
            expression.changed.subscribe((change) => {
                printValue(change.value);
            });

            console.log(`Value of 'a.b.c.d' after changing 'a' to '{ b: Promise.resolve({ c: Promise.resolve({ d: 200 }) }) }':`);
            await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
                expressionContext.a =   { b: Promise.resolve({ c: Promise.resolve({ d: 200 }) }) };
            });

            console.log(`Final value of 'a.b.c.d':`)
            printValue(expression.value);
        } finally {
            // Always dispose of expressions after use.
            expression.dispose();
        }
    })();
    ```

### Multiplication expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: 1,
        b: 3
    };

    const expression = expressionFactory.create(expressionContext, 'a * b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a * b':`);
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a * b' after changing 'a' to '6':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 6; })

        console.log(`Value of 'a * b' after changing 'b' to '4':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 4; })

        console.log(`Final value of 'a * b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### New expression

```ts
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
        console.log(instance.constructor.name);
        printValue(instance);
    }

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'new type(value)':`);
        expression.changed.subscribe((change) => {
            print(change.value)
        });

        console.log(`Value of 'new type(value)' after changing 'value' to '20':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.value = 20; })

        console.log(`Value of 'new type(value)' after changing 'type' to 'Add10':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.type = Add10; })

        console.log(`Final value of 'new type(value)':`)
        print(expression.value);

    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Nullish coalescing expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: null,
        b: 10,
    };

    const expression = expressionFactory.create(expressionContext, 'a ?? b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a ?? b':`);
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a ?? b' after changing 'b' to '6':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 6; })

        console.log(`Value of 'a ?? b' after changing 'a' to '10':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 10; })

        console.log(`Value of 'a ?? b' after changing 'a' to 'null':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = null; })


        console.log(`Final value of 'a ?? b'':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Object expression

```ts
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
        x: 10,
        y: 20,
    };

    const expression = expressionFactory.create(expressionContext, '({ a: x, b: y })');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of '({ a: x, b: y })':`);
        expression.changed.subscribe((change) => {
            printValue(change.value)
        });

        console.log(`Value of '({ a: x, b: y })' after changing 'x' to '100':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.x = 100; })

        console.log(`Value of '({ a: x, b: y })' after changing 'y' to '200':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.y = 200; })

        console.log(`Final value of '({ a: x, b: y })':`)
        printValue(expression.value);

    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Remainder expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
import {
    IExpressionFactory,
    RsXExpressionParserInjectionTokens,
    RsXExpressionParserModule
} from '@rs-x/expression-parser';

// Load the expression parser module into the injection container
InjectionContainer.load(RsXExpressionParserModule);
const expressionFactory: IExpressionFactory = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionFactory);

export const run = (async () => {
    const expressionContext =  { 
        a: 5, 
        b: 2 
    }

    const expression = expressionFactory.create(expressionContext, 'a % b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of a % b':`);
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a % b' after changing 'a' to '6':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 6; })

        console.log(`Value of 'a % b after changing 'b' to '4':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 4; })

        console.log(`Final value of 'a % b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Sequence expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        b: 2,
        value: 100,
        setB(v: number) {
            this.b = v;
        },
    };

    const expression = expressionFactory.create(expressionContext, '(setB(value), b)');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of (setB(value), b)':`);
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of '(setB(value)', b)' after changing 'value' to '200':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.value = 200; })


        console.log(`Value of '(setB(value)', b)' after changing 'b' to '300':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 300; })


        console.log(`Final value of '(setB(value), b)':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Strict equality expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: 3,
        b: 2 as string| number
    };

    const expression = expressionFactory.create(expressionContext, 'a === b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a === b':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a === b' after changing 'a' to '2':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 2; });

        console.log(`Value of 'a === b' after changing 'b' to '"2"':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = '2'; });

        console.log(`Final value of 'a === b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Strict inequality expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: 2 as string | number,
        b: 2 as string | number
    };

    const expression = expressionFactory.create(expressionContext, 'a !== b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a !== b':`)
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a !== b' after changing 'a' to '"2"':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = '2'; });

        console.log(`Value of 'a !== b' after changing 'b' to '"2"':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = '2'; });

        console.log(`Final value of 'a !== b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Substraction expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        a: 1,
        b: 3
    };

    const expression = expressionFactory.create(expressionContext, 'a - b');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of 'a - b':`);
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of 'a - b' after changing 'a' to '6':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.a = 6; })

        console.log(`Value of 'a - b' after changing 'b' to '4':`)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.b = 4; })

        console.log(`Final value of 'a - b':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Template string expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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


```

### Typeof expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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


```

### Unary negation expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        value: 1
    };

    const expression = expressionFactory.create(expressionContext, '-value');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of '-value':`);
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of '-value' after changing 'value' to '-5':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.value = -5; })

        console.log(`Final value of '-value':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```

### Unary plus expression

```ts
import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
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
        value: '2' 
    }

    const expression = expressionFactory.create(expressionContext, '+value');

    try {
        // Wait until the expression has been resolved (has a value)
        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        console.log(`Initial value of '+value':`);
        expression.changed.subscribe((change) => {
            console.log(change.value);
        });

        console.log(`Value of '+value' after changing 'value' to '"6"':`);
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { expressionContext.value = '6'; })

        console.log(`Final value of '+value':`)
        console.log(expression.value);
    } finally {
        // Always dispose of expressions after use.
        expression.dispose();
    }
})();


```