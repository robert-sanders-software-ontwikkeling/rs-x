# @rs-x/cli

Command line installer for RS-X developer tooling.

## Postinstall behavior

When `@rs-x/cli` is installed, it attempts to install the VS Code extension
automatically if the `code` CLI is available:

- from the bundled local `.vsix` included in the package.

Disable this behavior with:

```bash
RSX_SKIP_VSCODE_EXTENSION_INSTALL=true
```

## What gets installed

Installing `@rs-x/cli` gives you the `rsx` command.
For prerelease builds, install globally to make the `rsx` binary available:

```bash
npm install -g @rs-x/cli@next
```

Running `rsx init` installs:

- runtime packages: `@rs-x/core`, `@rs-x/state-manager`, `@rs-x/expression-parser`
- compiler/tooling packages: `@rs-x/compiler`, `@rs-x/typescript-plugin`
- framework-specific packages when required by setup/template (for example `@rs-x/angular`, `@rs-x/react`, or `@rs-x/vue`)

## VS Code extension features

The rs-x VS Code extension provides:

- RS-X expression IntelliSense
- RS-X expression diagnostics in TS/JS files
- integration through `@rs-x/typescript-plugin`

## If VSIX install fails

1. Make sure the VS Code CLI is available:
   - `code --version`
2. Retry install:
   - `npx rsx install vscode --force`
3. Install manually from a VSIX path if needed:
   - `code --install-extension "/absolute/path/to/rs-x-vscode-extension-<version>.vsix"`
4. In CI/restricted shells, disable auto-install:
   - `RSX_SKIP_VSCODE_EXTENSION_INSTALL=true`

## Commands

- `rsx doctor`
- `rsx add` (aliases: `rsx -a`, `rsx -add`)
- `rsx install vscode [--force] [--local] [--dry-run]`
- `rsx install compiler [--pm <pnpm|npm|yarn|bun>] [--next] [--dry-run]`
- `rsx setup [--pm <pnpm|npm|yarn|bun>] [--next] [--force] [--local] [--dry-run]`
- `rsx init [--pm <pnpm|npm|yarn|bun>] [--entry <path>] [--next] [--skip-install] [--skip-vscode] [--force] [--local] [--dry-run]`
- `rsx project [angular|vuejs|react|nextjs|nodejs] [--name <project-name>] [--template <...>] [--pm <pnpm|npm|yarn|bun>] [--next] [--skip-install] [--skip-vscode] [--dry-run]`
- `rsx build [--project <path-to-tsconfig>] [--out-dir <path>] [--dry-run]`
- `rsx typecheck [--project <path-to-tsconfig>] [--dry-run]`

`rsx init` does:

- install runtime packages: `@rs-x/core`, `@rs-x/state-manager`, `@rs-x/expression-parser`
- install compiler tooling: `@rs-x/compiler`, `@rs-x/typescript-plugin`
- detect project context (`angular`, `react`, `vuejs`, `generic`, `next`)
- create `rsx-bootstrap.ts` (or `.js`) with async module loading
- patch startup file to `await initRsx()` before app bootstrap:
  - React: wraps `createRoot(...).render(...)`
  - Angular: wraps `bootstrapApplication(...)` / `bootstrapModule(...)`
  - Generic: wraps `main();`-style startup call
  - Vue: wraps `createApp(...).mount(...)`
  - Next.js: creates `RsxBootstrapGate` client component and wraps app children (`app/layout.*`) or `<Component />` (`pages/_app.*`)
- install VS Code extension (unless `--skip-vscode`)

`rsx setup` behavior:

- `rsx setup` auto-detects framework (`angular`, `react`, `vuejs`, `next`, fallback generic) and runs matching setup flow.

`rsx project` template extras:

- `angular`: installs `@rs-x/angular`
- `react` and `nextjs`: install `@rs-x/react`
- `vuejs`: installs `@rs-x/vue` and replaces `src/App.vue` with an RS-X expression example (`useRsxExpression('a + b', { model })`)

## Examples

```bash
npx @rs-x/cli init
npx @rs-x/cli init --entry src/main.ts --skip-vscode
npx @rs-x/cli setup
npx @rs-x/cli install vscode --force
npx @rs-x/cli install compiler --pm pnpm
npx @rs-x/cli install compiler --next
npx @rs-x/cli typecheck --project tsconfig.json
```
