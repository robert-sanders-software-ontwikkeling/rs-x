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

- **Expression with a promise** — `promise + 2` (where `promise` resolves to a number)
- **Expression with an observable** - `observable + 2` (where `observable` emits a number)
- **Expression referencing nested async data**

  ```ts
  import {
    emptyFunction,
    InjectionContainer,
    printValue,
    WaitForEvent,
  } from '@rs-x/core';
  import {
    type IExpressionFactory,
    RsXExpressionParserInjectionTokens,
    RsXExpressionParserModule,
  } from '@rs-x/expression-parser';

  // Load the expression parser module into the injection container
  InjectionContainer.load(RsXExpressionParserModule);
  const expressionFactory: IExpressionFactory = InjectionContainer.get(
    RsXExpressionParserInjectionTokens.IExpressionFactory,
  );

  export const run = (async () => {
    const model = {
      a: {
        b: Promise.resolve({
          c: Promise.resolve({
            d: 20,
          }),
        }),
      },
    };

    const expression = expressionFactory.create(model, `a.b.c.d`);

    try {
      // Wait until the expression has been resolved (has a value)
      await new WaitForEvent(expression, 'changed').wait(emptyFunction);

      console.log(`Initial value of 'a.b.c.d':`);
      expression.changed.subscribe((change) => {
        printValue(change.value);
      });

      console.log(
        `Value of 'a.b.c.d' after changing 'a' to '{ b: Promise.resolve({ c: Promise.resolve({ d: 200 }) }) }':`,
      );
      await new WaitForEvent(expression, 'changed', {
        ignoreInitialValue: true,
      }).wait(() => {
        model.a = {
          b: Promise.resolve({ c: Promise.resolve({ d: 200 }) }),
        };
      });

      console.log(`Final value of 'a.b.c.d':`);
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
    b: 20,
  };

  const expr1 = expressionFactory.create(model, '(a + 1)');
  const expr2 = expressionFactory.create(model, '(b + 2)');

  const modularModel = {
    expr1,
    expr2,
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
  - **Aim:** Provide a system for detecting changes in data models through bound JavaScript expressions.
  - **Goal:** Make the data that expressions depend on fully reactive, allowing updates to propagate automatically.
  - **Objective:** Bind expressions to the data model so that RS-X can track dependencies and trigger updates only where needed. Most of the remaining work consists of finishing documentation and cleaning up the code.
  - **Impact:**
    - Enables RS-X to **update only what changes**, improving performance and efficiency.
    - Simplifies state management by keeping the data model reactive without extra developer effort.

- [**Angular Extension**](rs-x-angular/README.md) — ✅ **Done**
  - **Aim:** Enable the use of RS-X expressions directly within Angular templates.
  - **Goal:** Make **data binding to complex data in Angular easy and efficient** — the `rsx-pipe` can fully replace the `async` pipe or Angular `signals`. See [Using rsx-pipe](https://stackblitz.com/~/github.com/robert-sanders-software-ontwikkeling/rs-x-angular-demo) for a working demo.
  - **Objective:** Provide a reactive bridge between your data model and the UI, ensuring that Angular templates automatically update when the underlying data changes.
  - **Impact:**
    - Simplifies **state management and reactive updates** in Angular apps.
    - Makes data binding to complex data more efficient.
    - Allows you to define the data model for your app as the **single source of truth**.
    - Any changes to the model are **automatically detected** by the RS-X framework — no extra work is needed from the developer.

- **React Extension** — ✅ **Done**
  - **Aim:** Enable the use of RS-X expressions directly within React components.
  - **Goal:** Make **data binding to complex data in React easy and efficient**, providing hooks and utilities that automatically subscribe to expression changes and trigger re-renders.
  - **Objective:** Support both synchronous and asynchronous data sources, allowing modular expressions to seamlessly update components when underlying data changes.
  - **Impact:**
    - Simplifies **state management and reactivity** in React apps.
    - Improves **rendering efficiency** by updating only affected components.
    - Allows your data model to act as the **single source of truth**.
    - Any changes to the model are **automatically detected** by the RS-X framework — no extra work is needed from the developer.

- **TS Transformer / Plugin — ⚙️ Planned**
  - **Aim:** Provide **compile-time syntax validation** for RS-X expressions written in tagged template literals or lambda-like strings.
  - **Goal:** Offer **IntelliSense / autocomplete** for all properties on the provided context, preventing invalid identifiers from compiling.
  - **Objective:** Automatically convert tagged template expressions (e.g., ``rsX`x + observable` ``) into RS-X expression trees at **compile time**.
  - **Impact:**
    - Enables **full TypeScript safety** for reactive expressions and prevents runtime errors.
    - Eliminates **runtime parsing**, resulting in **significant performance gains** in large or frequently updated reactive models.

    #### **Example Usage**

    ```ts
    import { BehaviorSubject } from 'rxjs';
    import { rsX } from 'rs-x-transformer-planned';

    const model = {
      x: 10,
      observable: new BehaviorSubject(20),
    };

    // ✅ Correct expression — compiles and subscribes to changes
    const expression1 = rsX`x + observable`(model);
    expression1.change.subscribe(() => console.log(expression1.value));

    // ❌ Incorrect expression — will fail at compile time
    // const expression2 = rsX`x + y`(model);
    // Error: 'y' does not exist on model

    // ❌ Syntax error — will fail at compile time
    // const expression3 = rsX`x + `();
    // Error: incomplete expression
    ```

- **HTML Transformer / Plugin** — ⚙️ **Planned**
  - **Aim:** Enable the use of RS-X expressions directly within HTML templates.
  - **Goal:** Automatically extract expressions from HTML, generate RS-X expression trees in TypeScript, and update HTML elements to reference those trees.
  - **Objective:** Provide **compile-time validation** for inline HTML expressions, ensuring that any invalid references or syntax errors are caught before runtime, while keeping templates reactive.
  - **Impact:**
    - Enables **compile-time safety** for HTML-bound expressions.
    - Eliminates the need for runtime parsing of expressions.
    - Keeps HTML templates **reactive and consistent** with the underlying data model.
    - Simplifies integration between HTML templates and RS-X expression trees, reducing boilerplate and potential errors.

- **Developer Chrome Plugin** — ⚙️ **Planned**
  - **Aim:** Provide developers with a tool to inspect and debug RS-X expressions and application state directly in the browser.
  - **Goal:** Allow tracking of expressions and the data model within an application, making it easy to monitor changes and understand reactive flows.
  - **Objective:** Enable setting breakpoints on expressions and observing state updates in real time, helping developers diagnose issues efficiently.
  - **Impact:**
    - Simplifies debugging of reactive expressions and application state.
    - Provides visibility into RS-X internals without modifying application code.
    - Improves developer productivity by making state changes and expression updates transparent and traceable.

- **RS-X Presentation Layer** — 🔧 **In progress / Needs refactoring**
  - **Aim:** Provide a flexible framework for building UI components with RS-X, keeping presentation and logic separate.
  - **Goal:** Allow users to define components internally as [Custom Elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) while maintaining simplicity and readability in templates.
  - **Objective:** Enable developers to separate **presentation (HTML templates)** from application logic, staying as close as possible to the **HTML standard** and keeping templates expressive and easy to maintain.
  - **Impact:**
    - Simplifies component development by cleanly separating UI and logic.
    - Improves template readability and maintainability.
    - Provides a standardized way to create reusable, reactive UI components with RS-X.

  Example:

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
  - **Aim:** Provide a flexible system for injecting dynamic content into RS-X components using slots.
  - **Goal:** Allow developers to define multiple named slots in component templates for reusable and customizable layouts.
  - **Objective:** Enable content projection within components so that different sections (e.g., header, body) can be dynamically populated while keeping templates clean and maintainable.
    - **Example:**
      ```html
      <my-layout>
        <h1 slot="header">[[header]]</h1>
        <div slot="body">message</div>
      </my-layout>
      ```
  - **Impact:**
    - Supports **reusable and flexible layouts** across applications.
    - Allows **dynamic content injection**, improving component modularity.
    - Enhances maintainability and readability of complex templates.

- **Theming Support** — 🔧 **Mostly done / Needs refactoring**
- - **Aim:** Enable flexible theming for RS-X components, allowing easy visual customization.
  - **Goal:** Allow developers to define custom themes and switch between them simply by setting a `theme` property.
  - **Objective:** Leverage **CSS variables** to inject theme-specific styles into components, making it straightforward to apply consistent branding across the app.
  - **Impact:**
    - Simplifies visual customization and branding for applications.
    - Provides a consistent and maintainable approach to styling RS-X components.
    - Makes theme changes dynamic without requiring component code modifications.

- **Component Library** — ⚙️ **Planned / Ongoing**
  - **Aim:** Provide a versatile set of reusable UI components for RS-X applications.
  - **Goal:** Allow users to influence the development roadmap through a **voting system**, prioritizing which components should be built first.
  - **Objective:** Deliver high-quality, reusable components such as:
    - **Flexible popups** — customizable positioning and behavior
    - **Data display components with virtualization** — list view, table
    - **Pattern-based text editors** — date-time input, numeric input, custom-pattern input
  - **Impact:**
    - Builds a **community-driven ecosystem** of reusable components.
    - Increases development efficiency by focusing on components that are most needed.
    - Improves consistency and reusability across RS-X applications.

## Projects

- [rs-x-core](./rs-x-core/readme.md): Provides shared core functionality for the RS-X project
- [rs-x-state-manager](./rs-x-state-manager/readme.md): Implements a centralized state management system that provides an efficient way to observe, update, and synchronize state changes across your application. It supports reactive updates, ensuring that components or services depending on the state stay consistent automatically.
- [rs-x-expression-parser](./rs-x-expression-parser/readme.md): Implements a JavaScript expression parser that translates a JavaScript expression string into an observable expression tree. The parser automatically registers identifiers in the expression tree with the State Manager. Identifiers are resolved using the Identifier Owner Resolver service, which can be replaced with a custom implementation if needed. This parser serves as the core of the data binding system for the SPA framework, enabling transparent mixing of synchronous and asynchronous data.
- [rs-x-angular](./rs-x-angular/projects/rsx/README.md): Implements an **Aangular pipe** to provide seamless integration of RS-X expressions within Angular templates. It allows you to bind expressions to your data models, making your templates fully reactive without extra boilerplat
- [rs-x-react](./rs-x-react/readme.md): Implement **React hooks** to provide seamless integration of RS-X expressions within React. It allows you to bind expressions to your data models, making your templates fully reactive without extra boilerplate.

## Getting started

1. Install NodeJs
2. Install GIT
3. Install pnpm `npm install -g pnpm`
4. execute `pnpm -r install`
5. When using Visual Studio Code, install extensions.
   For example, the [Jest](https://marketplace.visualstudio.com/items?itemName=Orta.vscode-jest) extension is very useful for executing and debugging tests.

## Commands

- `pnmp build:core` : builds **rs-x-core** project
- `pnmp build:state-manager` : builds **rs-x-state-manager** project
- `pnmp build:expression-parser` : builds **rs-x-expression-parser** project
- `pnmp build:all` : build all projects
- `pnmp lint`: run es lint and without trying to fix errors automatically
- `pnmp lint:fix`: run es lint and tries to fix errors automatically
-

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
