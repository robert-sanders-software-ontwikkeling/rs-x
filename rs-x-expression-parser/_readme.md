# Expression parser

The **JavaScript Expression Parser** translates a JavaScript expression string into an **observable expression tree**. It automatically registers identifiers in the expression tree to the **State Manager**. Identifiers are resolved using an **Identifier Owner Resolver** service, which can be replaced by a custom implementation if needed. This parser forms the core of the **data binding implementation** for the SPA framework and allows mixing **synchronous** and **asynchronous** data transparently. 

### Examples

- Expression with a promise: ``promise + 2`` (where `promise` resolves to a number)
- Expression with an observable: ``observable + 2`` (where `observable` emits a number)
- Expression referencing nested async data: ``x.y.z + 2``

    ```ts
    const context = {
        x: Promise.resolve({
            y: { 
                z: Promise.resolve(10)
            }
        })
    };

    const parser: IExpressionParser =  InjectionContainer.get(
         RsXExpressionParserInjectionTokens.IExpressionParser
    );

    const expression = parser.parse(context, 'x.y.z + 2');

    // The current value is emitted upon subscription
    // For this example, it emits 12
    expression.changed.subscribe(() => {
        console.log(expression.value);
    });

    //Trigger change event
    context.x = Promise.resolve({
        y: { 
            z: Promise.resolve(12)
        }
    });
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

    registerMultiInjectServices(
      options,
      RsXExpressionParserInjectionTokens.IIdentifierOwnerResolverList,
      CUSTOM_LIST
    );

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