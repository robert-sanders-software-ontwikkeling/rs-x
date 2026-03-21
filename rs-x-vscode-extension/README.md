# RS-X VS Code Extension

This extension enables RS-X expression IntelliSense and diagnostics inside:

- `rsx('...')(model)`
- `expressionFactory.create(model, '...')`

## Build

```bash
pnpm --filter @rs-x/compiler run build
pnpm --filter @rs-x/typescript-plugin run build
pnpm --filter @rs-x/vscode-extension run build
```

## Package as VSIX

```bash
pnpm --filter @rs-x/vscode-extension run package
```

## One-command local install (recommended)

From the monorepo root:

```bash
pnpm run install:vscode-extension
```

This packages and installs `rs-x-vscode-extension` (which already bundles `@rs-x/typescript-plugin`).

You can run the same flow through the CLI:

```bash
npx @rs-x/cli install vscode --local
```

Then install the generated `.vsix` in VS Code:

1. Open Extensions panel.
2. Click `...` menu.
3. Choose `Install from VSIX...`.
4. Select the generated file.
