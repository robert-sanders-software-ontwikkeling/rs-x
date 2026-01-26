# RS-X

**A reactive framework that makes change detection and asynchronous data handling effortless.**

RS-X is a framework designed to simplify **reactive programming** by eliminating the need for manual change detection and explicit asynchronous state management.

At its core, RS-X combines a powerful [**reactive state manager**](rs-x-state-manager/readme.md) with a flexible [**JavaScript expression parser**](rs-x-expression-parser/readme.md). The expression parser translates plain JavaScript expressions into an **observable expression tree**, allowing **synchronous and asynchronous data** to be used transparently and consistently.

This means you no longer need to treat asynchronous data differently from synchronous data — **promises, observables, and plain values can be composed together as if they were all synchronous**. RS-X automatically tracks dependencies, resolves asynchronous values, and propagates changes efficiently throughout your application.

One of the most important applications of reactive programming is in **Single Page Application (SPA) frameworks** such as **Angular** and **React**, where efficient UI updates and precise change detection are critical.

RS-X is designed to serve as a **foundational reactive layer** for such frameworks. In addition, RS-X aims to provide its **own SPA-oriented integrations and extensions**, enabling **local, fine-grained, and highly efficient UI updates** without relying on coarse re-rendering strategies. This ensures that user interfaces update only where data actually changes, improving both performance and scalability.

RS-X will also provide **TypeScript and HTML language extensions** that parse expressions **at compile time** and replace them with prebuilt **observable expression trees**. These extensions will deliver **IntelliSense support and compile-time syntax validation**, eliminating runtime expression parsing and catching errors early during development.

## Key Concepts

- **Reactive state management** with fine-grained change detection  
- **Observable expression trees** derived from plain JavaScript expressions  
- **Transparent async handling** — promises and observables behave like normal values  
- **Composable expressions** — build complex logic from smaller, reusable expressions  
- **Automatic dependency tracking** with efficient and deterministic updates  
- **Compile-time tooling** for improved performance, IntelliSense, and early error detection  
---
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

## Support RS-X

If you find RS-X useful and want to support its development, consider becoming a sponsor. Your contributions make a real difference in keeping this project **sustainable, ambitious, and cutting-edge**.  

With your support, I can fully dedicate my time and talents to creating high-quality software for the community.  

- Faster development of new features  
- Improved stability and performance  
- Documentation, tutorials, and example projects  
- Continued open-source availability  

[![Sponsor RS-X](https://img.shields.io/badge/Sponsor-RS--X-orange?logo=github)](https://github.com/sponsors/robert-sanders-software-ontwikkeling)


## Roadmap

RS-X is actively evolving. The roadmap below shows **progress**, **planned features**, and **why each feature matters** for both developers and sponsors.  

---

- [**Expression Parser & Change Detection**](rs-x-expression-parser/readme.md) — ✅ **90% done**  
  - Most of the remaining work consists of finishing documentation and cleaning up the code.  
  - **Impact:** Enables RS-X to update only what changes, improving UI performance and developer productivity.  

- **Angular Extension** — ⚙️ **Planned**  
  - Enables the use of RS-X expressions within Angular templates.  
  - Makes **data binding in Angular easier** — no need for Redux, `async` pipes, or signals anymore.  
  - **Impact:** Simplifies state management and reactive updates in Angular apps, reducing boilerplate and improving developer productivity. 

- **React Extension** — ⚙️ **Planned / Planned**  
  - Integrates RS-X expressions in React components with hooks and utilities that automatically subscribe to expression changes and trigger re-renders.  
  - Supports both synchronous and asynchronous data sources and modular expressions.  
  - **Impact:** Simplifies React reactivity and improves rendering efficiency.  

- **TS Transformer / Plugin — ⚙️ Planned**
    - **Aim:** Provide **compile-time syntax validation** for RS-X expressions written in tagged template literals or lambda-like strings.  
    - **Goal:** Offer **IntelliSense / autocomplete** for all properties on the provided context, preventing invalid identifiers from compiling.  
    - **Objective:** Automatically convert tagged template expressions (e.g., ``rsX`x + observable` ``) into RS-X expression trees at **compile time**.  
    - **Impact:** 
      - Enables **full TypeScript safety** for reactive expressions and prevents runtime errors.  
      - Eliminates **runtime parsing**, resulting in **significant performance gains** in large or frequently updated reactive contexts.


      #### **Example Usage**

      ```ts
      import { BehaviorSubject } from 'rxjs';
      import { rsX } from 'rs-x-transformer-planned';

      const context = {
        x: 10,
        observable: new BehaviorSubject(20)
      };

      // ✅ Correct expression — compiles and subscribes to changes
      const expression1 = rsX`x + observable`(context);
      expression1.change.subscribe(() => console.log(expression1.value));

      // ❌ Incorrect expression — will fail at compile time
      // const expression2 = rsX`x + y`(context); 
      // Error: 'y' does not exist on context

      // ❌ Syntax error — will fail at compile time
      // const expression3 = rsX`x + `(); 
      // Error: incomplete expression
      ```
-  **HTML Transformer / Plugin** — ⚙️ Planned

   - **Goal:** Automatically extract expressions from HTML, create RS-X expression trees in TypeScript, and update HTML to reference those trees.  
   - **Objectives:**
     - Inline HTML expressions like `[[ x + observable ]]` are validated at compile time.
     - TypeScript catches any invalid references or syntax errors before runtime.
     - HTML elements are automatically adapted to reference the generated expression tree.

   - **Impact:**
     - Provides **type safety and IntelliSense** inside HTML templates.
     - Eliminates runtime parsing, improving performance.
     - Keeps HTML clean and declarative while enabling full reactivity via RS-X.
- **RS-X Presentation Layer** — 🔧 **In progress / Needs refactoring**  
  - Provides a framework for defining components (internally implemented as [Custom Elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)).  
  - Users can **separate presentation (HTML templates) from logic**.  
  - The goal is to stay as close as possible to the **HTML standard**, while keeping templates **simple, readable, and expressive**.  
  - Example:
    ```html
    <label click.on="showMessage(message)">
      <input
        type="checkbox"
        name="checkbox"
        checked.twoway="show"
      />
      [[show ? 'Hide' : 'Show']]
    </label>

    <p>
      <div if.struct="show" tooltip.attach="message">
        [[message]]
      </div>
    </p>
    ```
  - **Explanation of the HTML example:**  
    - **Data-binding expressions** are identified by suffixing attributes (custom or standard) with:  
      - `.oneway` — one-way binding  
      - `.twoway` — two-way binding  
      - `.onetime` — one-time binding  
    - **Text bindings** are identified by surrounding an expression with `[[ ... ]]`.  
    - **Event bindings** are defined by appending `.on` to the event attribute.  
    - There are two types of directives:  
      - **Structural directives** — identified by appending `.struct` to the directive name. They dynamically generate or modify HTML based on a **data-binding expression**.  
      - **Behavioral directives** — identified by appending `.attach` to the directive name. They attach **behavior or logic** to a specific element without altering the DOM structure.  
  - **Impact:** Streamlines UI development, keeps templates declarative and maintainable, and demonstrates RS-X’s **fine-grained reactive capabilities**.  

- **Content Projection** — 🔧 **Mostly done / Needs refactoring**  
  - Supports defining multiple slots in component templates.  
  - Example:
    ```html
    <my-layout>
        <h1 slot="header">[[header]]</h1>
        <div slot="body">message</div>
    </my-layout>
    ```
  - **Impact:** Enables reusable, flexible layouts and dynamic content injection.  

- **Theming Support** — 🔧 **Mostly done / Needs refactoring**  
  - Users can define custom themes, and changing themes is as simple as setting a `theme` property.  
  - Leverages **CSS variables** to inject theme-specific properties into components.  
  - **Impact:** Simplifies visual customization and branding for apps.  

- **Component Library** — ⚙️ **Planned / Ongoing**  
  - Introduce a **voting system** to let users prioritize which components should be developed first.  
  - Examples:  
    - **Flexible popups** — customizable positioning and behavior  
    - **Data display components with virtualization**: list view, table  
    - **Pattern-based text editors**: date-time input, numeric input, custom-pattern input  
  - **Impact:** Builds a versatile ecosystem of reusable components driven by community demand.

- Implement **expression parser** and solve the **change detection problem**: 90% done. Most of the remaining work consists of finishing documentation and cleaning up the code.

- **Angular extension** — enables the use of RS-X expressions within Angular templates. This removes the need for `async` pipes or `signals` and allows fully reactive, modular expressions to be used across components.  

- **React extension** — enables the use of RS-X expressions within React components. Provides hooks and utilities that automatically subscribe to expression changes and trigger re-renders, supporting both synchronous and asynchronous data sources, as well as modular expressions.

- Implement the **RS-X presentation layer**. A significant amount of work has already been done, but it needs to be refactored to fully leverage the **expression parser** and documentation needs to be written. The presentation layer provides a framework for defining components (internally implemented as [Custom Elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)). Users should be able to **separate presentation (HTML templates) from logic**. The goal is to stay as close as possible to the **HTML standard**, while keeping templates **simple, readable, and expressive**. In the example below, we can observe the following conventions:
  ```html
    <label click.on="showMessage(message)">
      <input
        type="checkbox"
        name="checkbox"
        checked.twoway="show"
      />
      [[show ? 'Hide' : 'Show']]
    </label>

    <p>
      <div if.struct="show" tooltip.attach="message">
        [[message]]
      </div>
    </p>
    ```

  - **Data-binding expressions** are identified by suffixing attributes (custom or standard) with:
    - `.oneway` — one-way binding  
    - `.twoway` — two-way binding  
    - `.onetime` — one-time binding  

  - **Text bindings** are identified by surrounding an expression with `[[ ... ]]`.

  - **Event bindings** are defined by appending `.on` to the event attribute.

  - There are two types of directives:
    - **Structural directives** — identified by appending `.struct` to the directive name. They dynamically generate or modify HTML based on a **data-binding expression**.  

    - **Behavioral directives** — identified by appending `.attach` to the directive name. They attach **behavior or logic** to a specific element without altering the DOM structure.
  
- **Support for Content Projection** – Already implemented for a large part, but needs refactoring. In the example below, we have a component `my-layout` which has defined **two slots** in its template:

  ```html
  <my-layout>
      <h1 slot="header">
          [[header]]
      </h1>
      <div slot="body">
          message
      </div>
  </my-layout>
  ```
- **Theming support** — Already implemented for the most part, but needs refactoring.  You can define **custom themes**, and changing themes will be as simple as setting a `theme` property. The framework relies on **CSS variables** to inject theme-specific properties into your components, enabling dynamic and flexible styling.
- **Implementing components** — The list of possible components is endless, but I want to introduce a **voting system** so users can vote on which components they would most like to see. Examples of planned components include:

  - **Flexible popups** — You can define how they should be positioned and how they behave when the content is not fully visible.
  
  - **Components for displaying lists of data with virtualization support**, such as:
    - List view
    - Table

  - **Text editors** that support patterns to define allowed input, for example:
    - Date-time input
    - Numeric input
    - Input with a custom pattern


## Projects

* [rs-x-core](./rs-x-core/readme.md): Provides shared core functionality for the RS-X project
* [rs-x-state-manager](./rs-x-state-manager/readme.md): Implements a centralized state management system that provides an efficient way to observe, update, and synchronize state changes across your application. It supports reactive updates, ensuring that components or services depending on the state stay consistent automatically.
* [rs-x-expression-parser](./rs-x-expression-parser/readme.md): Implements a JavaScript expression parser that translates a JavaScript expression string into an observable expression tree. The parser automatically registers identifiers in the expression tree with the State Manager. Identifiers are resolved using the Identifier Owner Resolver service, which can be replaced with a custom implementation if needed. This parser serves as the core of the data binding system for the SPA framework, enabling transparent mixing of synchronous and asynchronous data.
## Getting started

1. Install NodeJs
2. Install GIT
3. Install pnpm `npm install -g pnpm`
4. execute `pnpm -r install`
5. When using Visual Studio Code, install extensions.
For example, the [Jest](https://marketplace.visualstudio.com/items?itemName=Orta.vscode-jest) extension is very useful for executing and debugging tests.

## Commands
* `pnmp build:core` : builds **rs-x-core** project
* `pnmp build:state-manager` : builds **rs-x-state-manager** project
* `pnmp build:expression-parser` : builds **rs-x-expression-parser** project
* `pnmp build:all` : build all projects
* `pnmp lint`: run es lint and without trying to fix errors automatically
* `pnmp lint:fix`: run es lint and tries to fix errors automatically
* 


## Release & Publish Process

This document explains **step by step** how to publish a new release for this repository.  
No prior knowledge of the release pipeline is required. If you follow these steps in order, your packages will be versioned and published correctly.

---

### Overview

This project uses:

- **pnpm** as the package manager
- **Changesets** for versioning and changelog management
- **GitHub Actions** to automate building and publishing
- **npm** as the package registry

Releases are published **only from `release/*` branches** and are fully automated once the branch is pushed.

---

### High-Level Flow

1. Make changes on a feature branch  
2. Add a Changeset describing the change  
3. Merge changes into `main`  
4. Create a `release/*` branch  
5. Push the release branch  
6. GitHub Actions:
   - Validates changes
   - Applies version bumps
   - Builds packages
   - Publishes to npm

---

### Prerequisites

Before starting, make sure you have:

- Node.js (LTS)
- Git 
  

---

### Steo 1: Install packages if not already done

  npm install

---


### Step 2: Create Your Changes

Create a feature or fix branch and implement your changes.

    git checkout -b feature/my-change
    # make code changes

---

### Step 3: Add a Changeset

After completing your code changes, create a Changeset:

    pnpm changeset

You will be prompted to:

- Select the affected packages
- Choose the version bump type (`patch`, `minor`, or `major`)
- Write a short description of the change

This generates a markdown file in:

    .changeset/

**Important:**  
Every release **must** include at least one Changeset file.  
Without a Changeset, no versions will be published.

---

### Step 4: Merge Changes into `main`

Commit your changes and merge them into the `main` branch.

    git commit -am "Add feature X"
    git push origin feature/my-change

Then open a Pull Request and merge it into `main`.

---

### Step 5: Create a Release Branch

Create a release branch from `main`.

    git checkout main
    git pull origin main
    git checkout -b release/v1.2.0
    git push origin release/v1.2.0

The branch name **must** start with:

    release/

This naming convention is required to trigger the publish pipeline.

---

### Step 6: GitHub Actions Pipeline

Pushing a `release/*` branch automatically triggers the **Publish Packages** workflow.

The pipeline executes the following steps in order.

---

### Pipeline Step 1: Checkout Repository

- Checks out the release branch
- Disables default credentials to prevent accidental pushes

---

### Pipeline Step 2: Setup Node.js

Installs the latest **Node.js LTS** version.

---

### Pipeline Step 3: Install pnpm

Installs **pnpm v9**, required by the repository.

---

### Pipeline Step 4: Install Dependencies

    pnpm install

Dependencies are installed using the lockfile.

---

### Pipeline Step 5: Validate Release Branch Changes

The pipeline compares the release branch against `main`.

Only the following files may differ:

- `.changeset/**`
- `package.json`
- `pnpm-lock.yaml`

If any other file is changed, the pipeline **fails immediately**.

This guarantees that release branches contain **only versioning-related changes**.

---

### Pipeline Step 6: Apply Version Bumps

    pnpm changeset version

This step:

- Reads all Changeset files
- Updates package versions
- Updates changelogs

If version changes are generated:
- They are committed automatically
- The commit is pushed back to the same `release/*` branch

If no changes are needed, the step exits safely.

---

### Pipeline Step 7: Build Packages

    pnpm -r run build

All packages are built recursively.

If **any build fails**, the release is aborted.

---

### Pipeline Step 8: Publish Packages

    pnpm changeset publish

This step:

- Publishes only packages with new versions
- Skips versions that already exist on npm
- Uses the `NPM_TOKEN` secret for authentication

Once this step succeeds, the release is **live on npm**.

---

### Manual Workflow Trigger (Optional)

The workflow can also be triggered manually:

1. Go to **GitHub → Actions**
2. Select **Publish Packages**
3. Click **Run workflow**

This is useful for recovery or re-running a failed pipeline.

---

### Required GitHub Secrets

| Secret Name    | Description                                                           |
| -------------- | --------------------------------------------------------------------- |
| `NPM_TOKEN`    | Token used to publish packages to npm                                 |
| `PIPELINE_PAT` | Personal Access Token used to push commits back to the release branch |

---

### Common Issues

#### Unauthorized change detected

You modified files other than:
- `.changeset/**`
- `package.json`
- `pnpm-lock.yaml`

Move all code changes back to `main`.

---

#### Nothing gets published

Possible causes:
- No Changeset files
- Versions already published
- Build step failed

---

#### Publish step fails

Check:
- `NPM_TOKEN` permissions
- npm package ownership
- Registry availability

---

### Summary

To publish a new release:

1. Create a Changeset  
2. Merge it into `main`  
3. Create and push a `release/*` branch  
4. Let GitHub Actions handle the rest  

Once the workflow completes successfully, your packages are published 🎉



