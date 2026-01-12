# RS-X

This mono-repository contains the implementation of a SPA framework designed to solve the change detection problem and make data binding transparent. Work is still in progress.

Currently, it contains the following projects:

* [rs-x-core](./rs-x-core/readme.md): Provides shared core functionality for the RS-X project
* [rs-x-state-manager](./rs-x-state-manager/readme.md): Implements a centralized state management system that provides an efficient way to observe, update, and synchronize state changes across your application. It supports reactive updates, ensuring that components or services depending on the state stay consistent automatically.
* [rs-x-expression-parser](./rs-x-expression-parser/readme.md): Implements a JavaScript expression parser that translates a JavaScript expression string into an observable expression tree. The parser automatically registers identifiers in the expression tree with the State Manager. Identifiers are resolved using the Identifier Owner Resolver service, which can be replaced with a custom implementation if needed. This parser serves as the core of the data binding system for the SPA framework, enabling transparent mixing of synchronous and asynchronous data.

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
  



