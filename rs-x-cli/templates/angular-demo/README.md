# rsx-angular-example

Angular demo app for RS-X.

**Website & docs:** [rsxjs.com](https://www.rsxjs.com/)

This example shows a million-row virtual table that:

- uses the `rsx` pipe from `@rs-x/angular`
- creates row expressions with `rsx(...)`
- keeps a fixed pool of row models and expressions
- loads pages on demand while scrolling
- keeps memory bounded by reusing the row pool and pruning old page data

## Install

```bash
cd rsx-angular-example
npm install
```

## Start

```bash
npm start
```

`npm start` first runs the RS-X build step, then starts Angular.

## Build

```bash
npm run build
```

This runs:

1. `rsx build --project tsconfig.json --no-emit --prod`
2. `ng build`

So the example gets:

- RS-X semantic checks
- generated AOT RS-X caches
- Angular production build output

## Basic RS-X Angular setup

The example uses the normal Angular RS-X setup:

### 1. Register RS-X providers at bootstrap

In `src/main.ts`:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { providexRsx } from '@rs-x/angular';

bootstrapApplication(AppComponent, {
  providers: [...providexRsx()],
});
```

### 2. Create expressions with `rsx(...)`

In `src/app/virtual-table/row-model.ts`:

```ts
idExpr: rsx<number>('id')(model),
nameExpr: rsx<string>('name')(model),
totalExpr: rsx<number>('price * quantity')(model),
```

### 3. Bind them with `RsxPipe`

In `src/app/virtual-table/virtual-table.component.html`:

```html
<div *ngFor="let item of state.rowsExpression | rsx; trackBy: trackByIndex">
  <span>{{ item.row.nameExpr | rsx }}</span>
  <span>{{ item.row.totalExpr | rsx }}</span>
</div>
```

## Why this example is useful

The point of the demo is not just rendering a table. It shows how RS-X behaves in a realistic Angular scenario:

- large logical dataset: `1,000,000` rows
- small live expression pool: only the pooled row models stay active
- page loading is async to simulate real server requests
- old loaded pages are pruned so scrolling does not grow memory forever

## About the `rsx` pipe in this demo

This example uses the `rsx` pipe directly in the template so the RS-X behavior is easy to see.

That is a demo choice, not a restriction.

In a real Angular app, you can also adapt RS-X values into standard Angular constructs such as signals if that fits your component architecture better.

## Key files

- `src/main.ts`
- `src/app/app.component.ts`
- `src/app/app.component.html`
- `src/app/virtual-table/virtual-table.component.ts`
- `src/app/virtual-table/virtual-table.component.html`
- `src/app/virtual-table/virtual-table-model.ts`
- `src/app/virtual-table/virtual-table-data.service.ts`
- `src/app/virtual-table/row-model.ts`

## Notes

- The virtual table uses a bounded pool and bounded page retention on purpose, so performance characteristics stay visible while memory stays under control.
