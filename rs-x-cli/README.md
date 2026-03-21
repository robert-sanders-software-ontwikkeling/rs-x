# @rs-x/cli

Command line installer for RS-X developer tooling.

## Commands

- `rsx doctor`
- `rsx add` (aliases: `rsx -a`, `rsx -add`)
- `rsx install vscode [--force] [--local] [--dry-run]`
- `rsx install compiler [--pm <pnpm|npm|yarn|bun>] [--dry-run]`
- `rsx setup [--pm <pnpm|npm|yarn|bun>] [--force] [--local] [--dry-run]`
- `rsx init [--pm <pnpm|npm|yarn|bun>] [--entry <path>] [--skip-install] [--skip-vscode] [--force] [--local] [--dry-run]`

`rsx init` does:

- install runtime packages: `@rs-x/core`, `@rs-x/state-manager`, `@rs-x/expression-parser`
- install compiler tooling: `@rs-x/compiler`, `@rs-x/typescript-plugin`
- detect project context (`angular`, `react`, `generic`, `next`)
- create `rsx-bootstrap.ts` (or `.js`) with async module loading
- patch startup file to `await initRsx()` before app bootstrap:
  - React: wraps `createRoot(...).render(...)`
  - Angular: wraps `bootstrapApplication(...)` / `bootstrapModule(...)`
  - Generic: wraps `main();`-style startup call
  - Next.js: creates `RsxBootstrapGate` client component and wraps app children (`app/layout.*`) or `<Component />` (`pages/_app.*`)
- install VS Code extension (unless `--skip-vscode`)

## Examples

```bash
npx @rs-x/cli init
npx @rs-x/cli init --entry src/main.ts --skip-vscode
npx @rs-x/cli setup
npx @rs-x/cli install vscode --force
npx @rs-x/cli install compiler --pm pnpm
```
