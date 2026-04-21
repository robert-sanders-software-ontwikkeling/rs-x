# @rs-x/core

## 2.0.3

### Patch Changes

- 6632da1: Cli fix
- 294500d: Patch cli

## 2.0.0

### Major Changes

- 42521ca: RS-X 2.0.0 release notes:
  - Breaking: `useRsxExpression` now accepts only pre-built `IExpression` instances from `rsx(...)(model)`. String overloads and options are removed.
  - Breaking: `@rs-x/react` no longer exports `getExpressionFactory()` or `getExpressionManager()`.
  - New: `@rs-x/vue` package with `useRsxExpression` composable, docs, and tests.
  - New: React export `getExpressionChangeTransactionManager()` for batching updates (parity with Angular).
  - New: RS-X CLI compiler tooling workflow with `rsx install compiler`, `rsx build --project ...`, and `rsx typecheck --project ...` for installing compiler packages, generating AOT output, and running RS-X semantic validation from the command line.
  - New: RS-X CLI project/bootstrap workflows for Angular, React, Vue, Next, and Node.js via `rsx init` and `rsx project`, including generated framework bootstrap modules driven by `rsx.config.json` and support for custom generated module output paths.
  - New: RS-X VS Code extension with IntelliSense and diagnostics for RS-X expressions in TS/JS/Vue projects, `rsx.config.json` schema validation, embedded RS-X syntax highlighting, and TypeScript plugin integration.
  - New: interactive framework runtime labs and compiler-backed editable examples across the React, Vue, Angular, and Next.js docs.
  - Docs/site refresh: framework pages updated to rsx-first flow, RxJS playground examples fixed, official framework links added, and new SEO landing pages/sitemap updates.
  - Tooling/CI: lockfile hash + commit SHA debug output added to workflows; `ci:build` mirrors GitHub Actions.
  - Performance/compiler: parser/compiler optimizations plus new benchmarks and profiling scripts.

## 1.0.2

### Patch Changes

- f3bc0ce: React rs-x extension
- 082e52c: Fix to many call when initializing sequence expression

## 0.4.12

### Patch Changes

- 0f9eff6: Implemented expression caching
- dd2e895: Refactor: Made expression creation independent of context
- d04e4e6: Refactor: Made expression parser independent of context
- 9b6b38d: By default, expression leaves are no longer watched recursively.
  You can now configure this behavior using a leaf-index-watch-rule.
- 3d25024: Implemented expression cloning


# @rs-x/state-manager

## 2.0.3

### Patch Changes

- 6632da1: Cli fix
- 294500d: Patch cli
- Updated dependencies [6632da1]
- Updated dependencies [294500d]
  - @rs-x/core@2.0.3

## 2.0.0

### Major Changes

- 42521ca: RS-X 2.0.0 release notes:
  - Breaking: `useRsxExpression` now accepts only pre-built `IExpression` instances from `rsx(...)(model)`. String overloads and options are removed.
  - Breaking: `@rs-x/react` no longer exports `getExpressionFactory()` or `getExpressionManager()`.
  - New: `@rs-x/vue` package with `useRsxExpression` composable, docs, and tests.
  - New: React export `getExpressionChangeTransactionManager()` for batching updates (parity with Angular).
  - New: RS-X CLI compiler tooling workflow with `rsx install compiler`, `rsx build --project ...`, and `rsx typecheck --project ...` for installing compiler packages, generating AOT output, and running RS-X semantic validation from the command line.
  - New: RS-X CLI project/bootstrap workflows for Angular, React, Vue, Next, and Node.js via `rsx init` and `rsx project`, including generated framework bootstrap modules driven by `rsx.config.json` and support for custom generated module output paths.
  - New: RS-X VS Code extension with IntelliSense and diagnostics for RS-X expressions in TS/JS/Vue projects, `rsx.config.json` schema validation, embedded RS-X syntax highlighting, and TypeScript plugin integration.
  - New: interactive framework runtime labs and compiler-backed editable examples across the React, Vue, Angular, and Next.js docs.
  - Docs/site refresh: framework pages updated to rsx-first flow, RxJS playground examples fixed, official framework links added, and new SEO landing pages/sitemap updates.
  - Tooling/CI: lockfile hash + commit SHA debug output added to workflows; `ci:build` mirrors GitHub Actions.
  - Performance/compiler: parser/compiler optimizations plus new benchmarks and profiling scripts.

### Patch Changes

- Updated dependencies [42521ca]
  - @rs-x/core@2.0.0

## 1.0.2

### Patch Changes

- 082e52c: Fix to many call when initializing sequence expression
- Updated dependencies [f3bc0ce]
- Updated dependencies [082e52c]
  - @rs-x/core@1.0.2

## 0.4.12

### Patch Changes

- Updated dependencies [0f9eff6]
- Updated dependencies [dd2e895]
- Updated dependencies [d04e4e6]
- Updated dependencies [9b6b38d]
- Updated dependencies [3d25024]
  - @rs-x/core@0.4.12


# @rs-x/expression-parser

## 2.0.3

### Patch Changes

- 6632da1: Cli fix
- 294500d: Patch cli
- Updated dependencies [6632da1]
- Updated dependencies [294500d]
  - @rs-x/core@2.0.3
  - @rs-x/state-manager@2.0.3

## 2.0.0

### Major Changes

- 42521ca: RS-X 2.0.0 release notes:
  - Breaking: `useRsxExpression` now accepts only pre-built `IExpression` instances from `rsx(...)(model)`. String overloads and options are removed.
  - Breaking: `@rs-x/react` no longer exports `getExpressionFactory()` or `getExpressionManager()`.
  - New: `@rs-x/vue` package with `useRsxExpression` composable, docs, and tests.
  - New: React export `getExpressionChangeTransactionManager()` for batching updates (parity with Angular).
  - New: RS-X CLI compiler tooling workflow with `rsx install compiler`, `rsx build --project ...`, and `rsx typecheck --project ...` for installing compiler packages, generating AOT output, and running RS-X semantic validation from the command line.
  - New: RS-X CLI project/bootstrap workflows for Angular, React, Vue, Next, and Node.js via `rsx init` and `rsx project`, including generated framework bootstrap modules driven by `rsx.config.json` and support for custom generated module output paths.
  - New: RS-X VS Code extension with IntelliSense and diagnostics for RS-X expressions in TS/JS/Vue projects, `rsx.config.json` schema validation, embedded RS-X syntax highlighting, and TypeScript plugin integration.
  - New: interactive framework runtime labs and compiler-backed editable examples across the React, Vue, Angular, and Next.js docs.
  - Docs/site refresh: framework pages updated to rsx-first flow, RxJS playground examples fixed, official framework links added, and new SEO landing pages/sitemap updates.
  - Tooling/CI: lockfile hash + commit SHA debug output added to workflows; `ci:build` mirrors GitHub Actions.
  - Performance/compiler: parser/compiler optimizations plus new benchmarks and profiling scripts.

### Patch Changes

- Updated dependencies [42521ca]
  - @rs-x/core@2.0.0
  - @rs-x/state-manager@2.0.0

## 1.0.2

### Patch Changes

- 082e52c: Fix to many call when initializing sequence expression
- Updated dependencies [f3bc0ce]
- Updated dependencies [082e52c]
  - @rs-x/core@1.0.2
  - @rs-x/state-manager@1.0.2

## 0.4.12

### Patch Changes

- Updated dependencies [0f9eff6]
- Updated dependencies [dd2e895]
- Updated dependencies [d04e4e6]
- Updated dependencies [9b6b38d]
- Updated dependencies [3d25024]
  - @rs-x/core@0.4.12
  - @rs-x/state-manager@0.4.12


# @rs-x/compiler

## 2.0.3

### Patch Changes

- 6632da1: Cli fix
- 294500d: Patch cli
- Updated dependencies [6632da1]
- Updated dependencies [294500d]
  - @rs-x/expression-parser@2.0.3

## 2.0.0

### Major Changes

- 42521ca: RS-X 2.0.0 release notes:
  - Breaking: `useRsxExpression` now accepts only pre-built `IExpression` instances from `rsx(...)(model)`. String overloads and options are removed.
  - Breaking: `@rs-x/react` no longer exports `getExpressionFactory()` or `getExpressionManager()`.
  - New: `@rs-x/vue` package with `useRsxExpression` composable, docs, and tests.
  - New: React export `getExpressionChangeTransactionManager()` for batching updates (parity with Angular).
  - New: RS-X CLI compiler tooling workflow with `rsx install compiler`, `rsx build --project ...`, and `rsx typecheck --project ...` for installing compiler packages, generating AOT output, and running RS-X semantic validation from the command line.
  - New: RS-X CLI project/bootstrap workflows for Angular, React, Vue, Next, and Node.js via `rsx init` and `rsx project`, including generated framework bootstrap modules driven by `rsx.config.json` and support for custom generated module output paths.
  - New: RS-X VS Code extension with IntelliSense and diagnostics for RS-X expressions in TS/JS/Vue projects, `rsx.config.json` schema validation, embedded RS-X syntax highlighting, and TypeScript plugin integration.
  - New: interactive framework runtime labs and compiler-backed editable examples across the React, Vue, Angular, and Next.js docs.
  - Docs/site refresh: framework pages updated to rsx-first flow, RxJS playground examples fixed, official framework links added, and new SEO landing pages/sitemap updates.
  - Tooling/CI: lockfile hash + commit SHA debug output added to workflows; `ci:build` mirrors GitHub Actions.
  - Performance/compiler: parser/compiler optimizations plus new benchmarks and profiling scripts.

### Patch Changes

- Updated dependencies [42521ca]
  - @rs-x/expression-parser@2.0.0


# @rs-x/typescript-plugin

## 2.0.3

### Patch Changes

- 6632da1: Cli fix
- 294500d: Patch cli
- Updated dependencies [6632da1]
- Updated dependencies [294500d]
  - @rs-x/compiler@2.0.3

## 2.0.0

### Major Changes

- 42521ca: RS-X 2.0.0 release notes:
  - Breaking: `useRsxExpression` now accepts only pre-built `IExpression` instances from `rsx(...)(model)`. String overloads and options are removed.
  - Breaking: `@rs-x/react` no longer exports `getExpressionFactory()` or `getExpressionManager()`.
  - New: `@rs-x/vue` package with `useRsxExpression` composable, docs, and tests.
  - New: React export `getExpressionChangeTransactionManager()` for batching updates (parity with Angular).
  - New: RS-X CLI compiler tooling workflow with `rsx install compiler`, `rsx build --project ...`, and `rsx typecheck --project ...` for installing compiler packages, generating AOT output, and running RS-X semantic validation from the command line.
  - New: RS-X CLI project/bootstrap workflows for Angular, React, Vue, Next, and Node.js via `rsx init` and `rsx project`, including generated framework bootstrap modules driven by `rsx.config.json` and support for custom generated module output paths.
  - New: RS-X VS Code extension with IntelliSense and diagnostics for RS-X expressions in TS/JS/Vue projects, `rsx.config.json` schema validation, embedded RS-X syntax highlighting, and TypeScript plugin integration.
  - New: interactive framework runtime labs and compiler-backed editable examples across the React, Vue, Angular, and Next.js docs.
  - Docs/site refresh: framework pages updated to rsx-first flow, RxJS playground examples fixed, official framework links added, and new SEO landing pages/sitemap updates.
  - Tooling/CI: lockfile hash + commit SHA debug output added to workflows; `ci:build` mirrors GitHub Actions.
  - Performance/compiler: parser/compiler optimizations plus new benchmarks and profiling scripts.

### Patch Changes

- Updated dependencies [42521ca]
  - @rs-x/compiler@2.0.0


# @rs-x/cli

## 2.0.3

### Patch Changes

- 6632da1: Cli fix
- 294500d: Patch cli

## 2.0.0

### Major Changes

- 42521ca: RS-X 2.0.0 release notes:
  - Breaking: `useRsxExpression` now accepts only pre-built `IExpression` instances from `rsx(...)(model)`. String overloads and options are removed.
  - Breaking: `@rs-x/react` no longer exports `getExpressionFactory()` or `getExpressionManager()`.
  - New: `@rs-x/vue` package with `useRsxExpression` composable, docs, and tests.
  - New: React export `getExpressionChangeTransactionManager()` for batching updates (parity with Angular).
  - New: RS-X CLI compiler tooling workflow with `rsx install compiler`, `rsx build --project ...`, and `rsx typecheck --project ...` for installing compiler packages, generating AOT output, and running RS-X semantic validation from the command line.
  - New: RS-X CLI project/bootstrap workflows for Angular, React, Vue, Next, and Node.js via `rsx init` and `rsx project`, including generated framework bootstrap modules driven by `rsx.config.json` and support for custom generated module output paths.
  - New: RS-X VS Code extension with IntelliSense and diagnostics for RS-X expressions in TS/JS/Vue projects, `rsx.config.json` schema validation, embedded RS-X syntax highlighting, and TypeScript plugin integration.
  - New: interactive framework runtime labs and compiler-backed editable examples across the React, Vue, Angular, and Next.js docs.
  - Docs/site refresh: framework pages updated to rsx-first flow, RxJS playground examples fixed, official framework links added, and new SEO landing pages/sitemap updates.
  - Tooling/CI: lockfile hash + commit SHA debug output added to workflows; `ci:build` mirrors GitHub Actions.
  - Performance/compiler: parser/compiler optimizations plus new benchmarks and profiling scripts.


# @rs-x/react

## 2.0.3

### Patch Changes

- 6632da1: Cli fix
- 294500d: Patch cli
- Updated dependencies [6632da1]
- Updated dependencies [294500d]
  - @rs-x/core@2.0.3
  - @rs-x/expression-parser@2.0.3
  - @rs-x/state-manager@2.0.3

## 2.0.0

### Major Changes

- 42521ca: RS-X 2.0.0 release notes:
  - Breaking: `useRsxExpression` now accepts only pre-built `IExpression` instances from `rsx(...)(model)`. String overloads and options are removed.
  - Breaking: `@rs-x/react` no longer exports `getExpressionFactory()` or `getExpressionManager()`.
  - New: `@rs-x/vue` package with `useRsxExpression` composable, docs, and tests.
  - New: React export `getExpressionChangeTransactionManager()` for batching updates (parity with Angular).
  - New: RS-X CLI compiler tooling workflow with `rsx install compiler`, `rsx build --project ...`, and `rsx typecheck --project ...` for installing compiler packages, generating AOT output, and running RS-X semantic validation from the command line.
  - New: RS-X CLI project/bootstrap workflows for Angular, React, Vue, Next, and Node.js via `rsx init` and `rsx project`, including generated framework bootstrap modules driven by `rsx.config.json` and support for custom generated module output paths.
  - New: RS-X VS Code extension with IntelliSense and diagnostics for RS-X expressions in TS/JS/Vue projects, `rsx.config.json` schema validation, embedded RS-X syntax highlighting, and TypeScript plugin integration.
  - New: interactive framework runtime labs and compiler-backed editable examples across the React, Vue, Angular, and Next.js docs.
  - Docs/site refresh: framework pages updated to rsx-first flow, RxJS playground examples fixed, official framework links added, and new SEO landing pages/sitemap updates.
  - Tooling/CI: lockfile hash + commit SHA debug output added to workflows; `ci:build` mirrors GitHub Actions.
  - Performance/compiler: parser/compiler optimizations plus new benchmarks and profiling scripts.

### Patch Changes

- Updated dependencies [42521ca]
  - @rs-x/core@2.0.0
  - @rs-x/state-manager@2.0.0
  - @rs-x/expression-parser@2.0.0

## 1.0.2

### Patch Changes

- 082e52c: Fix to many call when initializing sequence expression
- Updated dependencies [f3bc0ce]
- Updated dependencies [082e52c]
  - @rs-x/core@1.0.2
  - @rs-x/expression-parser@1.0.2
  - @rs-x/state-manager@1.0.2


# @rs-x/vue

## 2.0.3

### Patch Changes

- 6632da1: Cli fix
- 294500d: Patch cli
- Updated dependencies [6632da1]
- Updated dependencies [294500d]
  - @rs-x/core@2.0.3
  - @rs-x/expression-parser@2.0.3
  - @rs-x/state-manager@2.0.3

## 2.0.0

### Major Changes

- 42521ca: RS-X 2.0.0 release notes:
  - Breaking: `useRsxExpression` now accepts only pre-built `IExpression` instances from `rsx(...)(model)`. String overloads and options are removed.
  - Breaking: `@rs-x/react` no longer exports `getExpressionFactory()` or `getExpressionManager()`.
  - New: `@rs-x/vue` package with `useRsxExpression` composable, docs, and tests.
  - New: React export `getExpressionChangeTransactionManager()` for batching updates (parity with Angular).
  - New: RS-X CLI compiler tooling workflow with `rsx install compiler`, `rsx build --project ...`, and `rsx typecheck --project ...` for installing compiler packages, generating AOT output, and running RS-X semantic validation from the command line.
  - New: RS-X CLI project/bootstrap workflows for Angular, React, Vue, Next, and Node.js via `rsx init` and `rsx project`, including generated framework bootstrap modules driven by `rsx.config.json` and support for custom generated module output paths.
  - New: RS-X VS Code extension with IntelliSense and diagnostics for RS-X expressions in TS/JS/Vue projects, `rsx.config.json` schema validation, embedded RS-X syntax highlighting, and TypeScript plugin integration.
  - New: interactive framework runtime labs and compiler-backed editable examples across the React, Vue, Angular, and Next.js docs.
  - Docs/site refresh: framework pages updated to rsx-first flow, RxJS playground examples fixed, official framework links added, and new SEO landing pages/sitemap updates.
  - Tooling/CI: lockfile hash + commit SHA debug output added to workflows; `ci:build` mirrors GitHub Actions.
  - Performance/compiler: parser/compiler optimizations plus new benchmarks and profiling scripts.

### Patch Changes

- Updated dependencies [42521ca]
  - @rs-x/core@2.0.0
  - @rs-x/state-manager@2.0.0
  - @rs-x/expression-parser@2.0.0


# @rs-x/react-components

## 2.0.3

### Patch Changes

- 6632da1: Cli fix
- 294500d: Patch cli
- Updated dependencies [6632da1]
- Updated dependencies [294500d]
  - @rs-x/angular@2.0.3
  - @rs-x/compiler@2.0.3
  - @rs-x/core@2.0.3
  - @rs-x/expression-parser@2.0.3
  - @rs-x/react@2.0.3
  - @rs-x/state-manager@2.0.3
  - @rs-x/vue@2.0.3

## 2.0.0

### Major Changes

- 42521ca: RS-X 2.0.0 release notes:
  - Breaking: `useRsxExpression` now accepts only pre-built `IExpression` instances from `rsx(...)(model)`. String overloads and options are removed.
  - Breaking: `@rs-x/react` no longer exports `getExpressionFactory()` or `getExpressionManager()`.
  - New: `@rs-x/vue` package with `useRsxExpression` composable, docs, and tests.
  - New: React export `getExpressionChangeTransactionManager()` for batching updates (parity with Angular).
  - New: RS-X CLI compiler tooling workflow with `rsx install compiler`, `rsx build --project ...`, and `rsx typecheck --project ...` for installing compiler packages, generating AOT output, and running RS-X semantic validation from the command line.
  - New: RS-X CLI project/bootstrap workflows for Angular, React, Vue, Next, and Node.js via `rsx init` and `rsx project`, including generated framework bootstrap modules driven by `rsx.config.json` and support for custom generated module output paths.
  - New: RS-X VS Code extension with IntelliSense and diagnostics for RS-X expressions in TS/JS/Vue projects, `rsx.config.json` schema validation, embedded RS-X syntax highlighting, and TypeScript plugin integration.
  - New: interactive framework runtime labs and compiler-backed editable examples across the React, Vue, Angular, and Next.js docs.
  - Docs/site refresh: framework pages updated to rsx-first flow, RxJS playground examples fixed, official framework links added, and new SEO landing pages/sitemap updates.
  - Tooling/CI: lockfile hash + commit SHA debug output added to workflows; `ci:build` mirrors GitHub Actions.
  - Performance/compiler: parser/compiler optimizations plus new benchmarks and profiling scripts.

### Patch Changes

- Updated dependencies [42521ca]
  - @rs-x/core@2.0.0
  - @rs-x/state-manager@2.0.0
  - @rs-x/expression-parser@2.0.0
  - @rs-x/compiler@2.0.0
  - @rs-x/react@2.0.0
  - @rs-x/vue@2.0.0
  - @rs-x/angular@2.0.0

## 1.0.2

### Patch Changes

- 082e52c: Fix to many call when initializing sequence expression
- Updated dependencies [f3bc0ce]
- Updated dependencies [082e52c]
  - @rs-x/core@1.0.2
  - @rs-x/expression-parser@1.0.2
  - @rs-x/state-manager@1.0.2


# @rs-x/angular

## 2.0.3

### Patch Changes

- 6632da1: Cli fix
- 294500d: Patch cli
- Updated dependencies [6632da1]
- Updated dependencies [294500d]
  - @rs-x/core@2.0.3
  - @rs-x/expression-parser@2.0.3

## 2.0.0

### Major Changes

- 42521ca: RS-X 2.0.0 release notes:
  - Breaking: `useRsxExpression` now accepts only pre-built `IExpression` instances from `rsx(...)(model)`. String overloads and options are removed.
  - Breaking: `@rs-x/react` no longer exports `getExpressionFactory()` or `getExpressionManager()`.
  - New: `@rs-x/vue` package with `useRsxExpression` composable, docs, and tests.
  - New: React export `getExpressionChangeTransactionManager()` for batching updates (parity with Angular).
  - New: RS-X CLI compiler tooling workflow with `rsx install compiler`, `rsx build --project ...`, and `rsx typecheck --project ...` for installing compiler packages, generating AOT output, and running RS-X semantic validation from the command line.
  - New: RS-X CLI project/bootstrap workflows for Angular, React, Vue, Next, and Node.js via `rsx init` and `rsx project`, including generated framework bootstrap modules driven by `rsx.config.json` and support for custom generated module output paths.
  - New: RS-X VS Code extension with IntelliSense and diagnostics for RS-X expressions in TS/JS/Vue projects, `rsx.config.json` schema validation, embedded RS-X syntax highlighting, and TypeScript plugin integration.
  - New: interactive framework runtime labs and compiler-backed editable examples across the React, Vue, Angular, and Next.js docs.
  - Docs/site refresh: framework pages updated to rsx-first flow, RxJS playground examples fixed, official framework links added, and new SEO landing pages/sitemap updates.
  - Tooling/CI: lockfile hash + commit SHA debug output added to workflows; `ci:build` mirrors GitHub Actions.
  - Performance/compiler: parser/compiler optimizations plus new benchmarks and profiling scripts.

### Patch Changes

- Updated dependencies [42521ca]
  - @rs-x/core@2.0.0
  - @rs-x/expression-parser@2.0.0

## 1.0.2

### Patch Changes

- 082e52c: Fix to many call when initializing sequence expression
- Updated dependencies [f3bc0ce]
- Updated dependencies [082e52c]
  - @rs-x/core@1.0.2
  - @rs-x/expression-parser@1.0.2

## 0.4.12

### Patch Changes

- Updated dependencies [0f9eff6]
- Updated dependencies [dd2e895]
- Updated dependencies [d04e4e6]
- Updated dependencies [9b6b38d]
- Updated dependencies [3d25024]
  - @rs-x/core@0.4.12
  - @rs-x/expression-parser@0.4.12


