# rs-x core concepts performance benchmark

Generated at: 2026-03-25T21:41:41.114Z
Machine: Apple M4, 16.0 GB RAM, darwin/arm64, OS 24.6.0
Node: v25.4.0

## How to read this report

- Parse by node count: how long it takes to read an expression string and build the internal expression tree.
- Parse cache behavior: the first time an expression string appears, rs-x parses it and stores a cached template tree. When the same string is used again, rs-x skips parsing and clones that cached template.
- Binding performance: first-time setup cost when an expression is attached to a model and its first value is computed.
- Update performance: cost after setup when data changes; only affected bound expressions are recalculated.
- In this benchmark, each bound row expression is `a + b`.
- `Single update` changes one row (`a` for one bound expression), so only that row expression is recalculated.
- `Bulk update` changes every row (`a` for all bound expressions), so each bound row expression is recalculated once.
- Memory usage: `Median heap` is typical JS heap after a run; `Peak RSS` is highest process memory while running.
- Parse scenarios execute 5,000 parse/create operations per sample and do not bind to models.
- Binding/update scenarios use the exact binding count shown in each row.

## Comparison guidance

- Compare runs only when machine, Node version, and benchmark script are the same.
- Prefer medians over min/max to avoid overreacting to GC and scheduler noise.
- For release notes, validate changes with repeated runs and track the median trend.

## Parse by node count

| Nodes | Expression                                                                                                                                                                            | Median (ms) | us/op |  ops/s |
| ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------: | ----: | -----: |
|     1 | `v0`                                                                                                                                                                                  |       9.791 |  1.96 | 510654 |
|     3 | `v0 + v1`                                                                                                                                                                             |      18.604 |  3.72 | 268760 |
|     7 | `v0 + v1 + v2 + v3`                                                                                                                                                                   |      34.224 |  6.84 | 146098 |
|    15 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7`                                                                                                                                               |      63.174 | 12.63 |  79146 |
|    31 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9 + v10 + v11 + v12 + v13 + v14 + v15`                                                                                                 |     120.930 | 24.19 |  41346 |
|    63 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9 + v10 + v11 + v12 + v13 + v14 + v15 + v16 + v17 + v18 + v19 + v20 + v21 + v22 + v23 + v24 + v25 + v26 + v27 + v28 + v29 + v30 + v31` |     286.024 | 57.20 |  17481 |

## Parse cache behavior (parse+clone vs clone-only)

| Nodes | Parse+clone median (ms) | Parse+clone us/op | Clone-only median (ms) | Clone-only us/op |
| ----: | ----------------------: | ----------------: | ---------------------: | ---------------: |
|     1 |                  10.343 |              2.07 |                  3.943 |             0.79 |
|     3 |                  21.731 |              4.35 |                 10.483 |             2.10 |
|     7 |                  37.918 |              7.58 |                 22.473 |             4.49 |
|    15 |                  71.355 |             14.27 |                 47.688 |             9.54 |
|    31 |                 131.846 |             26.37 |                 98.578 |            19.72 |
|    63 |                 255.354 |             51.07 |                207.264 |            41.45 |

## Binding performance (initial full evaluation)

| Bindings | Bind unique median (ms) | Bind same-expression median (ms) |
| -------: | ----------------------: | -------------------------------: |
|    1,000 |                  71.437 |                           60.169 |
|    3,000 |                 489.113 |                          414.515 |
|    5,000 |                1499.889 |                         1414.788 |
|   10,000 |                7306.124 |                         5859.936 |

## Update performance (incremental reevaluation)

| Bindings | Single update median (ms) | Bulk update median (ms) |
| -------: | ------------------------: | ----------------------: |
|    1,000 |                     0.648 |                  60.724 |
|    3,000 |                     1.251 |                 584.828 |
|    5,000 |                     2.556 |                1616.546 |
|   10,000 |                     4.979 |               17778.462 |

## Memory usage

| Scenario                      | Median heap after run (MB) | Peak RSS after run (MB) |
| ----------------------------- | -------------------------: | ----------------------: |
| Parse (1 nodes)               |                       11.7 |                    93.2 |
| Parse (3 nodes)               |                       11.9 |                    98.9 |
| Parse (7 nodes)               |                       13.4 |                   107.7 |
| Parse (15 nodes)              |                       16.5 |                   109.2 |
| Parse (31 nodes)              |                       13.8 |                   125.8 |
| Parse (63 nodes)              |                       14.8 |                   158.8 |
| Bind unique (1,000)           |                       94.2 |                   276.3 |
| Bind same expression (1,000)  |                      168.2 |                   375.7 |
| Single update (1,000)         |                      180.8 |                   393.5 |
| Bulk update (1,000)           |                      242.6 |                   403.0 |
| Bind unique (3,000)           |                      413.1 |                   683.2 |
| Bind same expression (3,000)  |                      625.9 |                   894.4 |
| Single update (3,000)         |                      674.2 |                   905.1 |
| Bulk update (3,000)           |                      695.1 |                   921.5 |
| Bind unique (5,000)           |                      997.0 |                  1305.0 |
| Bind same expression (5,000)  |                     1305.2 |                  1596.0 |
| Single update (5,000)         |                     1385.9 |                  1643.0 |
| Bulk update (5,000)           |                     1438.3 |                  1646.9 |
| Bind unique (10,000)          |                     1920.7 |                  2294.2 |
| Bind same expression (10,000) |                     2482.5 |                  2688.2 |
| Single update (10,000)        |                     2576.6 |                  2825.5 |
| Bulk update (10,000)          |                     2602.4 |                  2561.5 |
