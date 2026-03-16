# rs-x core concepts performance benchmark

Generated at: 2026-03-14T22:28:48.055Z
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
|     1 | `v0`                                                                                                                                                                                  |      27.410 |  5.48 | 182414 |
|     3 | `v0 + v1`                                                                                                                                                                             |      34.964 |  6.99 | 143003 |
|     7 | `v0 + v1 + v2 + v3`                                                                                                                                                                   |      52.618 | 10.52 |  95025 |
|    15 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7`                                                                                                                                               |      88.548 | 17.71 |  56466 |
|    31 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9 + v10 + v11 + v12 + v13 + v14 + v15`                                                                                                 |     125.867 | 25.17 |  39724 |
|    63 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9 + v10 + v11 + v12 + v13 + v14 + v15 + v16 + v17 + v18 + v19 + v20 + v21 + v22 + v23 + v24 + v25 + v26 + v27 + v28 + v29 + v30 + v31` |     221.475 | 44.29 |  22576 |

## Parse cache behavior (parse+clone vs clone-only)

| Nodes | Parse+clone median (ms) | Parse+clone us/op | Clone-only median (ms) | Clone-only us/op |
| ----: | ----------------------: | ----------------: | ---------------------: | ---------------: |
|     1 |                  27.221 |              5.44 |                  3.181 |             0.64 |
|     3 |                  55.063 |             11.01 |                  9.465 |             1.89 |
|     7 |                  78.192 |             15.64 |                 18.680 |             3.74 |
|    15 |                 116.379 |             23.28 |                 35.870 |             7.17 |
|    31 |                 205.565 |             41.11 |                 76.122 |            15.22 |
|    63 |                 404.932 |             80.99 |                133.894 |            26.78 |

## Binding performance (initial full evaluation)

| Bindings | Bind unique median (ms) | Bind same-expression median (ms) |
| -------: | ----------------------: | -------------------------------: |
|    1,000 |                  35.092 |                           25.444 |
|    3,000 |                 121.675 |                          123.711 |
|    5,000 |                 235.588 |                          228.468 |
|   10,000 |                 521.444 |                          638.054 |

## Update performance (incremental reevaluation)

| Bindings | Single update median (ms) | Bulk update median (ms) |
| -------: | ------------------------: | ----------------------: |
|    1,000 |                     0.089 |                   7.904 |
|    3,000 |                     0.077 |                  29.483 |
|    5,000 |                     0.071 |                  55.091 |
|   10,000 |                     0.107 |                 146.234 |

## Memory usage

| Scenario                      | Median heap after run (MB) | Peak RSS after run (MB) |
| ----------------------------- | -------------------------: | ----------------------: |
| Parse (1 nodes)               |                       10.9 |                   100.2 |
| Parse (3 nodes)               |                       15.9 |                   104.2 |
| Parse (7 nodes)               |                       12.2 |                    98.9 |
| Parse (15 nodes)              |                       12.5 |                    95.5 |
| Parse (31 nodes)              |                       21.3 |                   113.4 |
| Parse (63 nodes)              |                       23.8 |                   130.4 |
| Bind unique (1,000)           |                      125.1 |                   334.8 |
| Bind same expression (1,000)  |                      210.9 |                   420.3 |
| Single update (1,000)         |                      225.7 |                   425.6 |
| Bulk update (1,000)           |                      230.1 |                   426.6 |
| Bind unique (3,000)           |                      519.9 |                   830.9 |
| Bind same expression (3,000)  |                      788.6 |                  1090.9 |
| Single update (3,000)         |                      853.2 |                  1103.0 |
| Bulk update (3,000)           |                      865.1 |                  1104.9 |
| Bind unique (5,000)           |                     1270.1 |                  1522.9 |
| Bind same expression (5,000)  |                     1639.8 |                  1972.1 |
| Single update (5,000)         |                     1731.6 |                  1991.6 |
| Bulk update (5,000)           |                     1751.3 |                  2008.9 |
| Bind unique (10,000)          |                     2445.2 |                  2940.5 |
| Bind same expression (10,000) |                     3073.7 |                  3030.8 |
| Single update (10,000)        |                     3210.3 |                  3439.3 |
| Bulk update (10,000)          |                     3249.9 |                  3505.0 |
