# rs-x Project Context

## What is rs-x

rs-x is a reactive expression framework for TypeScript/JavaScript. The core primitive is `rsx(expression)(model)` — a string expression that is parsed, type-checked, and compiled into a reactive observable that updates when the model changes.

## Monorepo structure (pnpm workspaces)

| Package                       | Purpose                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| `rs-x-core`                   | Core runtime types and utilities                                                       |
| `rs-x-expression-parser`      | Expression string parser (`rsx(...)`) — JS + compiled hot-path variants                |
| `rs-x-compiler`               | TypeScript compiler integration: expression detection, validation, AOT code generation |
| `rs-x-typescript-plugin`      | TypeScript language service plugin — surfaces compiler diagnostics in IDEs             |
| `rs-x-vscode-extension`       | VS Code extension — registers the TypeScript plugin, adds IntelliSense                 |
| `rs-x-state-manager`          | State management layer built on top of expressions                                     |
| `rs-x-angular` / `rs-x-react` | Framework adapters                                                                     |
| `rs-x-cli`                    | CLI tool (`rsx`)                                                                       |

## Expression syntax and runtime translation

rsx expressions map to TypeScript/JS but with these runtime translations:

| Expression syntax | Runtime translation  | Type                                 |
| ----------------- | -------------------- | ------------------------------------ |
| `map[key]`        | `map.get(key)`       | `Map<K, V>` → value type `V`         |
| `set[key]`        | `set.get(key)`       | `Set<T>` → value type `T`            |
| `array[i]`        | `array[i]`           | `T[]` → element type `T`             |
| `record[key]`     | `record[key]`        | `Record<string, V>` → value type `V` |
| `date.year`       | `date.getFullYear()` | `Date` property accessor             |

**Key insight**: `Set` and `Map` use `[key]` bracket syntax in rsx even though they have no native index operator. The compiler/plugin must accept this and not report index-access errors.

## Compiler pipeline

```
Source file
  → expression-site-detector.ts   (finds all rsx(...) call sites)
  → expression-site-validator.ts  (type-checks expression string against model type)
  → expression-diagnostics.ts     (formats ICompilerDiagnostic[])
  → expression-aot-generator.ts   (AOT code generation for compiled mode)
```

### Key validator functions (`expression-site-validator.ts`)

- `resolveIndexedType` — handles `target[index]` expressions. Dispatches to `resolveMapValueType` (Map) and `resolveSetValueType` (Set) before falling back to TS index types.
- `resolveMapValueType` — extracts `V` from `Map<K, V>` for computed index access
- `resolveSetValueType` — extracts `T` from `Set<T>` for computed index access
- `resolveIdentifierType` — walks model type properties; also handles Map-keyed access for identifier contexts
- `unwrapRsxExpressionType` — unwraps `IExpression<T>`, `Observable<T>`, `Promise<T>`, `BehaviorSubject<T>`, etc.

## TypeScript plugin (IDE diagnostics)

- Entry: `rs-x-typescript-plugin/lib/index.ts`
- Compiled output: `rs-x-typescript-plugin/dist/index.js` — **must be rebuilt** after changing `rs-x-compiler`
- Error code namespace: `97xxx` (e.g. `97002` = "Index access is not valid for this type")
- Build command: `pnpm --filter @rs-x/compiler build && pnpm --filter @rs-x/typescript-plugin build`

## Tests

- Compiler tests: `pnpm --filter @rs-x/compiler test`
- Fixtures live in `rs-x-compiler/tests/fixtures/`
- Main semantic validation test: `rs-x-compiler/tests/expression-site-validator.test.ts`
- Fixture for valid/invalid expressions: `rs-x-compiler/tests/fixtures/semantic-validation.fixture.ts`
- When adding a new supported expression type: add to fixture + add expected result in the test's `toEqual` array (order matters — matches source order)

## After changing the compiler

1. Edit source in `rs-x-compiler/lib/`
2. Build: `pnpm --filter @rs-x/compiler build && pnpm --filter @rs-x/typescript-plugin build`
3. Restart TS server in VS Code (`TypeScript: Restart TS Server`) to pick up new plugin
4. Run tests: `pnpm --filter @rs-x/compiler test`

## Performance report (rs-x-site)

The site's performance report page at `rs-x-site/app/docs/core-concepts/performance-report/` has all data **hardcoded** in `performance-report.data.ts` — it does not load JSON at runtime.

### Benchmark scripts

| Script                                                                              | Output directory                         | Engine mode          |
| ----------------------------------------------------------------------------------- | ---------------------------------------- | -------------------- |
| `rs-x-expression-parser/scripts/benchmark-core-concepts-performance.mjs`            | `reports/rsx-core-concepts-performance/` | N/A                  |
| `rs-x-expression-parser/scripts/benchmark-angular-signals-comparison.mjs`           | `reports/angular-signals-comparison/`    | `compiled` (default) |
| `RSX_EXPRESSION_ENGINE_MODE=tree node ... benchmark-angular-signals-comparison.mjs` | `reports/angular-signals-comparison/`    | `tree`               |

Output files are named `benchmark-{YYYY-MM-DD}.json` (core concepts) and `benchmark-{YYYY-MM-DD}-{mode}.json` (angular comparison).

### Running benchmarks

The benchmarks require extra heap space and `--expose-gc`:

```bash
# Core concepts
node --max-old-space-size=8192 rs-x-expression-parser/scripts/benchmark-core-concepts-performance.mjs

# Angular signals comparison — compiled mode
node --expose-gc --max-old-space-size=8192 rs-x-expression-parser/scripts/benchmark-angular-signals-comparison.mjs

# Angular signals comparison — tree mode
RSX_EXPRESSION_ENGINE_MODE=tree node --expose-gc --max-old-space-size=8192 rs-x-expression-parser/scripts/benchmark-angular-signals-comparison.mjs
```

### Updating the site data

After running benchmarks, update `performance-report.data.ts`:

1. Update the three report path strings in `benchmarkMachine.newReport` and `expressionEngineModeBenchmark.{date,compiledReport,treeReport}`
2. Replace all hardcoded numeric data rows from the new JSON files:
   - Core concepts JSON sections: `parseByNodeCount`, `parseCacheByNodeCount`, `bindingScale`, `bindingScaleInitialized`, `identifierOnlyBindingScale`
   - Angular signals JSON scenarios: `syncIdentifier`, `asyncIdentifier`, `sameModelExpressions` (from both compiled + tree JSON)
3. `oldReport` / `oldVersion` stays fixed as the v1.0.0 baseline (`benchmark-2026-03-14.json`)
