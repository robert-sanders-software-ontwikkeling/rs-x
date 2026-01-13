# RS-X

**The SPA framework that solves the data binding problem with fine-grained UI updates.**

RS-X is an advanced **SPA framework** designed to tackle one of the most challenging problems in modern web development: **efficient data binding and local UI updates**. Unlike frameworks such as Angular or React, RS-X performs **fine-grained change detection**, updating only the parts of the UI that actually change. This makes your apps faster and more responsive.  

At its core, RS-X features a **reactive state manager** and a **JavaScript expression parser**, which together enable a transparent mix of **synchronous and asynchronous data**. This forms the foundation for reliable, efficient **data binding** throughout your application.  

## Reusable Core Modules

RS-X is designed with **reusability in mind**. Most of the core modules — including the **state manager**, **observable expression parser**, and **data binding utilities** — can be used **independently of the SPA framework**. This means you can leverage RS-X’s **reactive capabilities** in other projects, even if you aren’t building a full SPA.  

## My Vision

I plan to add a **large collection of components** and make RS-X the **most powerful SPA framework ever created**. However, I cannot commit to this full-time without sponsorship. Your support would allow me to focus on **building new features, optimizing performance, and maintaining high-quality documentation**.  

By sponsoring RS-X, you help maintain and enhance both the **SPA framework** and the **reusable core libraries**, making them more robust and versatile for the entire developer community. Your support enables:

- Faster development of new features  
- Improved stability and performance  
- Documentation, tutorials, and example projects  
- Continued open-source availability  

## Support RS-X

If you find RS-X useful and want to support its development, consider becoming a sponsor. Your contributions make a real difference in keeping this project **sustainable, ambitious, and cutting-edge**.  

[![Sponsor RS-X](https://img.shields.io/badge/Sponsor-RS--X-orange?logo=github)](https://github.com/sponsors/robert-sanders-software-ontwikkeling)

## Projects

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
  



