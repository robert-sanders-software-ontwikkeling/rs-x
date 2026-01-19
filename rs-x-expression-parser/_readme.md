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
    {% include_relative ../demo/src/rs-x-expression-parser/member-expression-with-promise.ts %}
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
{% include_relative ../demo/src/rs-x-expression-parser/use-cases/credit-risk-assessment-expression.ts %}
```

### Modular example

```ts
{% include_relative ../demo/src/rs-x-expression-parser/use-cases/credit-risk-assessment-expression-modular.ts %}
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
{% include_relative ../demo/src/rs-x-expression-parser/addition-expression.ts %}
```

### Array expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/array-expression.ts %}
```

### Bitwise and expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/bitwise-and-expression.ts %}
```

### Bitwise left shift expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/bitwise-left-shift-expression.ts %}
```

### Bitwise not expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/bitwise-not-expression.ts %}
```

### Bitwise or expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/bitwise-or-expression.ts %}
```

### Bitwise right shift expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/bitwise-right-shift-expression.ts %}
```

### Bitwise unsigned right shift expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/bitwise-unsigned-right-shift-expression.ts %}
```

### Bitwise xor expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/bitwise-xor-expression.ts %}
```

### Conditional expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/conditional-expression.ts %}
```

### Division expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/division-expression.ts %}
```

### Equality expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/equality-expression.ts %}
```

### Exponentiation expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/exponentiation-expression.ts %}
```

### Function expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/function-expression.ts %}
```

### Greater than expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/greater-than-expression.ts %}
```

### Greater than or equal expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/greater-than-or-equal-expression.ts %}
```

### In expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/in-expression.ts %}
```

### Inequality expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/inequality-expression.ts %}
```

### Instanceof expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/instanceof-expression.ts %}
```

### Less than expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/less-than-expression.ts %}
```

### Less than or equal expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/less-than-or-equal-expression.ts %}
```

### Logical and expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/logical-and-expression.ts %}
```

### Logical not expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/logical-not-expression.ts %}
```

### Logical or expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/logical-or-expression.ts %}
```

### Member expression

* Member expression
    ```ts
    {% include_relative ../demo/src/rs-x-expression-parser/member-expression.ts %}
    ```
* Member expression with array
    ```ts
    {% include_relative ../demo/src/rs-x-expression-parser/member-expression-with-array.ts %}
    ```
* Member expression with map
    ```ts
    {% include_relative ../demo/src/rs-x-expression-parser/member-expression-with-map.ts %}
    ```
* Member expression with method
    ```ts
    {% include_relative ../demo/src/rs-x-expression-parser/member-expression-with-method.ts %}
    ```
* Member expression with observable
    ```ts
    {% include_relative ../demo/src/rs-x-expression-parser/member-expression-with-observable.ts %}
    ```
* Member expression with promise
    ```ts
    {% include_relative ../demo/src/rs-x-expression-parser/member-expression-with-promise.ts %}
    ```

### Multiplication expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/multiplication-expression.ts %}
```

### New expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/new-expression.ts %}
```

### Nullish coalescing expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/nullish-coalescing-expression.ts %}
```

### Object expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/object-expression.ts %}
```

### Remainder expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/remainder-expression.ts %}
```

### Sequence expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/sequence-expression.ts %}
```

### Strict equality expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/strict-equality-expression.ts %}
```

### Strict inequality expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/strict-inequality-expression.ts %}
```

### Substraction expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/substraction-expression.ts %}
```

### Template string expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/template-string-expression.ts %}
```

### Typeof expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/typeof-expression.ts %}
```

### Unary negation expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/unary-negation-expression.ts %}
```

### Unary plus expression

```ts
{% include_relative ../demo/src/rs-x-expression-parser/unary-plus-expression.ts %}
```