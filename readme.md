# rs-x

Strongly typed, declarative reactivity for JavaScript & TypeScript.

rs-x binds plain JavaScript expressions to a data model and propagates updates automatically — synchronous, asynchronous (promises, observables), and mixed data all work transparently without a compilation step.

**Website & docs:** [rsxjs.com](https://rsxjs.com)

---

## Project Structure

| Package                  | Description                                                  |
| ------------------------ | ------------------------------------------------------------ |
| `rs-x-core`              | Shared core utilities                                        |
| `rs-x-state-manager`     | Reactive state management with fine-grained change detection |
| `rs-x-expression-parser` | JavaScript expression parser → observable expression tree    |
| `rs-x-compiler`          | Build-time transformer and compiled expression pipeline      |
| `rs-x-typescript-plugin` | TypeScript plugin for RS-X diagnostics                       |
| `rs-x-angular`           | Angular integration                                          |
| `rs-x-react`             | React integration                                            |
| `rs-x-vue`               | Vue integration                                              |
| `rs-x-react-components`  | React UI components                                          |
| `rs-x-dev-tools`         | Developer tools                                              |
| `rs-x-cli`               | CLI tooling for setup/build/typecheck                        |
| `rs-x-vscode-extension`  | VS Code extension                                            |
| `rs-x-site`              | Documentation website (Next.js)                              |

---

## Getting started

1. Install NodeJs
2. Install GIT
3. Install pnpm `npm install -g pnpm`
4. execute `pnpm -r install`
5. When using Visual Studio Code, install extensions.
   For example, the [Jest](https://marketplace.visualstudio.com/items?itemName=Orta.vscode-jest) extension is very useful for executing and debugging tests.

## Monorepo quick start

```bash
git clone https://github.com/robert-sanders-software-ontwikkeling/rs-x.git
# or: git clone git@github.com:robert-sanders-software-ontwikkeling/rs-x.git
cd rs-x
pnpm install
çpnpm build:libs
pnpm test
```

## Commands

- `pnpm build:core` : builds **rs-x-core** project
- `pnpm build:state-manager` : builds **rs-x-state-manager** project
- `pnpm build:expression-parser` : builds **rs-x-expression-parser** project
- `pnpm build:compiler` : builds **rs-x-compiler** project
- `pnpm build:ts-plugin` : builds **rs-x-typescript-plugin** project
- `pnpm build:react` : builds **rs-x-react** project
- `pnpm build:vue` : builds **rs-x-vue** project
- `pnpm build:angular` : builds the **rs-x-angular** project
- `pnpm build:react-components` : builds **rs-x-react-components** project
- `pnpm build:devtools` : builds **rs-x-dev-tools** project
- `pnpm build:expression-editor` : builds **rs-x-expression-editor** project
- `pnpm build:libs` : builds all library projects
- `pnpm build:vscode-extension` : builds **rs-x-vscode-extension** project
- `pnpm package:vscode-extension` : packages VS Code extension (VSIX)
- `pnpm install:vscode-extension` : package + install local RS-X VS Code extension (includes TS plugin)
- `pnpm install:compiler-tooling` : build local compiler tooling packages used by the monorepo (`@rs-x/expression-parser`, `@rs-x/compiler`, `@rs-x/typescript-plugin`)
- `pnpm init:rsx` : init project (packages + async RS-X bootstrap wiring + VS Code extension)
- `pnpm setup:developer-tooling` : build local compiler tooling + install the local VS Code extension
- `pnpm test` : run all tests
- `pnpm test:angular` : run Angular tests
- `pnpm test:react` : run React tests
- `pnpm test:performance` : run performance tests
- `pnpm test:compiled-expression` : run compiled-expression tests
- `pnpm lint` : run ESLint without auto-fixing
- `pnpm lint:fix` : run ESLint and auto-fix errors

### RS-X CLI

You can also use the CLI directly:

- `npx @rs-x/cli doctor`
- `npx @rs-x/cli init`
- `npx @rs-x/cli install compiler`
- `npx @rs-x/cli install vscode`

For local monorepo development (use local VSIX build): `npx @rs-x/cli install vscode --local`

---

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

### Step 1: Install packages if not already done

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

Installs the repository's pinned pnpm version.

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

    pnpm run build:libs
    pnpm run build:compiler
    pnpm run build:ts-plugin
    pnpm --filter @rs-x/cli run build
    pnpm run build:angular
    pnpm --filter @rs-x/react-components run build

If **any build fails**, the release is aborted.

---

### Pipeline Step 8: Publish Packages

    node scripts/publish-packages.mjs

This step:

- Publishes only packages with new versions
- Uses OIDC/provenance when possible
- Uses `NPM_TOKEN` only for first-time publishes

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
