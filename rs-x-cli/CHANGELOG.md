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
