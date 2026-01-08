# RS-X

## Getting started

1. Install NodeJs
2. Install GIT
3. execute `npm i`
4. When using Visual Studio Code, install extensions.
For example, the [Jest](https://marketplace.visualstudio.com/items?itemName=Orta.vscode-jest) extension is very useful for executing and debugging tests.

## Commands

* Build commands:
  * `pnmp build:core` : builds **rs-x-core** project
  * `pnmp build:state-manager` : builds **rs-x-state-manager** project
  * `pnmp build:expression-parser` : builds **rs-x-expression-parser** project
  * `pnmp build:all` : build all projects
* Release commands


## Release a new version

1. run command `pnpm changeset` . This will ask which packages you want to include. For example

    ```console
    🦋  Which packages would you like to include? … 
    ◯ changed packages
      ◯ @rs-x/expression-parser
      ◯ @rs-x/state-manager
      ◯ @rs-x/core
    ```

     Controls
      *	↑ / ↓ → move up and down
      *	Space → select / deselect an item
      *	Enter → confirm your selection

    Options explained

    * changed packages
      * Automatically selects packages that Git detects as changed
      * Best choice most of the time
      * Safer and faster

      ✅ Recommended unless you have a specific reason not to.


    * Individual packages

      Select these if:
      * You want to bump a package without code changes.
      * You want to include multiple packages.
      * Git didn’t detect changes correctly.
  
    **What happens next**

    After selecting packages, Changesets will ask
    1. What type of change?
        * patch – bug fix
        * minor – backward-compatible feature
        *	major – breaking change
    2.	Summary
        * Short description (goes into CHANGELOG)

    Then it will create a file like:

    `.changeset/my-release-fix.md`

2.  Commit and push the changes
3.  Run the release pipeline in github
  
---

## Projects

This mono-repository contains the implementation of a SPA framework designed to solve the change detection problem and make data binding transparent. Work is still in progress.

Currently, it contains the following projects:

### rs-x-core

**Shared core functionality for multiple projects:**

- **Deep Clone Service**  
  - Uses [structuredClone](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone) by default  
  - Falls back to [Lodash `cloneDeepWith`](https://lodash.com/docs/4.17.15#cloneDeepWith) for unsupported types

- **Equality Service**  
  - Uses [fast-equals](https://github.com/planttheidea/fast-equals) for deep equality
  
- **Guid Factory**
  - Uses crypto.randomUUID() to create GUIDs

- **Dependency Injection**  
  - Implemented with [Inversify](https://github.com/inversify/InversifyJS)

- **Abstract Singleton Factory**  
  - Ensures services are created only once  
  - Tracks reference counts and releases services when unused  
  - Example: used by [State Manager](###rs-x-state-manager) to avoid double-proxying objects, array indices, map keys, etc.

- **Index Value Accessor**  
  - Normalizes access to: object properties, array indices,  map keys, etc

- **Error Logging**  
  - Basic logging using `_console.error_`

- **WaitForEvent class**

   The **WaitForEvent** class is a handy utility to wait for an **Observable** to emit a value.  
    It is currently used extensively in unit tests to simplify asynchronous testing.

### rs-x-state-manager

The **State Manager** provides an efficient way to observe and synchronize state changes across your application.
It automatically **wraps (proxifies)** registered state objects, enabling transparent change detection without manual tracking.

The manager supports both **synchronous** and **asynchronous** state sources, automatically normalizing them to ensure consistent and predictable behavior.
Once registered, the State Manager takes care of observation, synchronization, and emits **change events** whenever any registered state is updated.

The State Manager is customizable, allowing you to add support for custom data types as needed.

Key Features
  - Automatic state observation via proxied objects.
  - Handles both synchronous and asynchronous state seamlessly.
  - Emits change events when any registered state changes.
  - Transparent normalization of asynchronous updates.
  - Fully customizable, supporting custom data types.
  - Eliminates manual state tracking, reducing boilerplate code.

## rs-x-expression-parser

The **JavaScript Expression Parser** translates a JavaScript expression string into an **observable expression tree**. It automatically registers identifiers in the expression tree to the **State Manager**. Identifiers are resolved using an **Identifier Resolver** service, which can be replaced by a custom implementation if needed. This parser forms the core of the **data binding implementation** for the SPA framework and allows mixing **synchronous** and **asynchronous** data transparently.

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

    expression.changed.subscribe(() => {
        // The current value is emitted upon subscription
        // For this example, it emits 12
        console.log(expression.value);
    });

    //Trigger change event
    context.x = Promise.resolve({
        y: { 
            z: Promise.resolve(12)
        }
    });

    
    ```

