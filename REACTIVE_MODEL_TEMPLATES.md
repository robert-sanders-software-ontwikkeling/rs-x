# Reactive Model Templates (Build-Time Shape → Runtime Speed)

This document captures a proposed optimization: use build-time knowledge of expression bindings to pre-compute reactive model “templates,” so runtime model initialization (proxy + watchers) can be fast and predictable, especially for SPA table/grid scenarios.

## Summary

In SPA frameworks, the data shape is usually **known at build time** because bindings in templates or expressions define which properties are accessed. We can leverage that to pre-compute a **reactive shape plan** and instantiate models using a **template factory** rather than discovering/patching at runtime.

Key idea:
- Build time: analyze expressions → infer model shape and watcher needs
- Runtime: instantiate models via a template (pre-wired) instead of `watchState` discovery

## Motivation

Today, most runtime cost is in **watch setup**:
- Proxies are created lazily, but **watchers are configured per instance**
- Repeated, high-volume object creation (e.g., table rows) pays that cost every time

If we know the shape from bindings, we can:
- pre-plan watchers and patch points
- avoid repeated discovery
- reduce per-instance allocation and setup cost

## What “Shape” Means

A template “shape” describes:
- which properties are accessed
- which properties must be observed
- which nodes are objects vs arrays vs dates vs maps
- which leaves are watched (based on leaf watch rules)

Example inferred shape from bindings:

```
row.a
row.b[0].c
row.d?.e
```

Implied shape plan (high level):
- `row` is object
- `row.a` is leaf
- `row.b` is array-like
- `row.b[*].c` is leaf
- `row.d` optional object; `row.d.e` leaf

## Proposed Architecture

### 1) Build-Time “Reactive Shape Plan”

Generated during compile/analysis phase (adjacent to the compiled expression plan):

```
interface ReactiveShapePlan {
  root: ShapeNode;
  watchRules: { leafWatchRule: string; }; // normalized rule used by the plan
  version: string; // versioned for compatibility
}

interface ShapeNode {
  kind: 'object' | 'array' | 'map' | 'set' | 'date' | 'leaf';
  optional?: boolean;
  props?: Record<string, ShapeNode>;   // for object
  items?: ShapeNode;                   // for array
  keys?: ShapeNode;                    // map keys
  values?: ShapeNode;                  // map values
}
```

The plan can be serialized alongside compiled expression outputs or cached in an AOT module.

### 2) Runtime Template Factory

Runtime API concept:

```
const template = stateManager.createTemplate(shapePlan);
const row = template.instantiate();
```

`instantiate()` creates:
- a new object instance
- a proxy (if configured)
- watcher wiring based on the plan

### 3) Row Pooling (Optional)

For table-like usage:

```
const pool = template.createPool({ capacity: 200 });
const row = pool.acquire();
// ... use row
pool.release(row); // resets and reuses
```

This avoids GC churn and repeated proxy creation.

## Why It’s Viable in SPAs

- Framework bindings are static (JSX/Template/Angular HTML)
- Expression strings are known at build time
- Existing compiler already builds expression dependency plans

We can extend that analysis to output “shape plans” without needing any runtime model.

## Benefits

- **Lower latency** for first bind (no discovery)
- **Lower CPU** on large lists / repeated rows
- **More predictable performance** for high‑frequency initialization
- **Potential simplification** of watch setup logic

## Risks / Complexity

### 1) Identity + sharing
Proxies are tied to object identity; templates must **create fresh instances**, not reuse proxy internals across models.

### 2) Mutable special types (Date, Array, Map, Set)
These require specialized watchers or patching. Template needs to know which strategy is used (proxy vs patch).

### 3) Compatibility with current StateManager
A template factory must preserve current semantics (events, ref counts, cleanup). It cannot silently skip hooks.

### 4) Schema drift
If runtime model shape diverges from the template, behavior must be defined:
- Ignore extra properties?
- Fail fast?
- Fallback to dynamic watch?

## Suggested Phase Plan

### Phase 1: Spike
- Build a minimal `ReactiveShapePlan`
- Template factory for plain objects + arrays
- Benchmark against baseline (watch setup time)

### Phase 2: Expand
- Add Date/Map/Set watchers to shape plan
- Add row pool and reset logic

### Phase 3: Compiler Integration
- Generate plan automatically from expressions
- Emit plan as AOT artifact
- Hook into runtime factory

## Where It Might Plug In (Code Areas)

- Expression analysis / compile plan:
  - `rs-x-expression-parser/lib/compiled-expression/compiled-expression.compiler.ts`
  - `rs-x-compiler` analyzer stages

- Watch setup / state manager:
  - `rs-x-state-manager/lib/state-manager/watch-factory/*`
  - `rs-x-state-manager/lib/object-observer/*`

## Open Questions

- Do we infer shapes from *only* expressions or also from explicit type metadata?
- How to combine multiple expressions into a shared template (union vs merge)?
- How to version/serialize templates for compiler artifacts?
- What’s the fallback behavior when runtime shape diverges?

## Proposed Next Step (Concrete)

Create a proof-of-concept:
- Build a `ReactiveShapePlan` for a known row shape
- Instantiate 200 rows via template
- Measure time vs baseline `watchState`

If the results show meaningful improvements, proceed to compiler integration.

---

This is a conceptual proposal and not committed to implementation yet. It should help guide profiling and future optimization decisions.
