# rsx-react-example

React demo app for RS-X.

**Website & docs:** [rsxjs.com](https://www.rsxjs.com/)

This example shows a million-row virtual table that:

- uses the `useRsxExpression` hook from `@rs-x/react`
- creates row expressions with `rsx(...)`
- keeps a fixed pool of row models and expressions
- loads pages on demand while scrolling
- keeps memory bounded by reusing the row pool and pruning old page data

## Install

```bash
cd rsx-react-example
npm install
```

## Start

```bash
npm run dev
```

`npm run dev` first runs the RS-X build step, then starts Vite.

## Build

```bash
npm run build
```

This runs:

1. `rsx build --project tsconfig.json --no-emit --prod`
2. `vite build`

So the example gets:

- RS-X semantic checks
- generated AOT RS-X caches
- React production build output

## Basic RS-X React setup

The example uses the normal React RS-X setup:

### 1. Initialize RS-X before rendering React

In `src/rsx-bootstrap.ts`:

```ts
import { InjectionContainer } from '@rs-x/core';
import { RsXExpressionParserModule } from '@rs-x/expression-parser';

export async function initRsx(): Promise<void> {
  await InjectionContainer.load(RsXExpressionParserModule);
}
```

### 2. Create expressions with `rsx(...)`

In `src/app/virtual-table/row-model.ts`:

```ts
idExpr: rsx<number>('id')(model),
nameExpr: rsx<string>('name')(model),
totalExpr: rsx<number>('price * quantity')(model),
```

### 3. Bind them with `useRsxExpression`

In `src/app/virtual-table/virtual-table-row.tsx`:

```tsx
const total = useRsxExpression(row.totalExpr);
return <span>{total}</span>;
```

## Why this example is useful

The point of the demo is not just rendering a table. It shows how RS-X behaves in a realistic React scenario:

- large logical dataset: `1,000,000` rows
- small live expression pool: only the pooled row models stay active
- page loading is async to simulate real server requests
- old loaded pages are pruned so scrolling does not grow memory forever

## About the React integration in this demo

This example uses `useRsxExpression` directly in row components so the RS-X behavior is easy to see.

That is a demo choice, not a restriction.

In a real React app, you can also bridge RS-X values into other React-friendly state shapes such as `useSyncExternalStore`, memoized selectors, or your preferred state container if that fits better.

## Key files

- `src/main.tsx`
- `src/rsx-bootstrap.ts`
- `src/app/app.tsx`
- `src/app/virtual-table/virtual-table-shell.tsx`
- `src/app/virtual-table/virtual-table-row.tsx`
- `src/app/virtual-table/virtual-table-controller.ts`
- `src/app/virtual-table/virtual-table-data.service.ts`
- `src/app/virtual-table/row-model.ts`

## Notes

- The virtual table uses a bounded pool and bounded page retention on purpose, so performance characteristics stay visible while memory stays under control.
