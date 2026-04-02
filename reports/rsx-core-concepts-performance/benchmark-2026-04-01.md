# rs-x core concepts performance benchmark

Generated at: 2026-04-01T18:26:23.032Z
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

| Nodes | Expression | Median (ms) | us/op | ops/s |
| ---: | --- | ---: | ---: | ---: |
| 1 | `v0` | 8.129 | 1.63 | 615113 |
| 3 | `v0 + v1` | 15.720 | 3.14 | 318067 |
| 7 | `v0 + v1 + v2 + v3` | 28.854 | 5.77 | 173289 |
| 15 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7` | 53.212 | 10.64 | 93964 |
| 31 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9 + v10 + v11 + v12 + v13 + v14 + v15` | 99.539 | 19.91 | 50231 |
| 63 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9 + v10 + v11 + v12 + v13 + v14 + v15 + v16 + v17 + v18 + v19 + v20 + v21 + v22 + v23 + v24 + v25 + v26 + v27 + v28 + v29 + v30 + v31` | 200.136 | 40.03 | 24983 |

## Parse cache behavior (parse+clone vs clone-only)

| Nodes | Parse+clone median (ms) | Parse+clone us/op | Clone-only median (ms) | Clone-only us/op |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 13.347 | 2.67 | 3.038 | 0.61 |
| 3 | 24.125 | 4.82 | 9.141 | 1.83 |
| 7 | 41.592 | 8.32 | 22.209 | 4.44 |
| 15 | 77.597 | 15.52 | 51.034 | 10.21 |
| 31 | 171.631 | 34.33 | 117.298 | 23.46 |
| 63 | 413.759 | 82.75 | 275.460 | 55.09 |

## Binding performance (initial full evaluation)

| Bindings | Bind unique median (ms) | Bind same-expression median (ms) |
| ---: | ---: | ---: |
| 1,000 | 73.024 | 65.637 |
| 3,000 | 325.506 | 341.632 |
| 5,000 | 3133.953 | 7152.229 |
| 10,000 | 6371.254 | 7391.622 |

## Update performance (incremental reevaluation)

| Bindings | Single update median (ms) | Bulk update median (ms) |
| ---: | ---: | ---: |
| 1,000 | 0.146 | 17.268 |
| 3,000 | 0.183 | 82.224 |
| 5,000 | 1.292 | 1552.662 |
| 10,000 | 5.769 | 6106.683 |

## Binding performance (bind + initialize)

| Bindings | Bind+initialize unique median (ms) | Bind+initialize same-expression median (ms) |
| ---: | ---: | ---: |
| 1,000 | 75.800 | 89.128 |
| 3,000 | 441.976 | 601.414 |
| 5,000 | 1479.033 | 1508.412 |
| 10,000 | 8887.964 | 15239.485 |

## Identifier-only binding (single field, most common pattern)

| Bindings | Bind median (ms) | Bind+initialize median (ms) | Single update median (ms) | Bulk update median (ms) |
| ---: | ---: | ---: | ---: | ---: |
| 100 | 42.845 | 41.876 | 0.345 | 1.696 |
| 500 | 68.581 | 69.090 | 0.454 | 13.085 |
| 1,000 | 135.099 | 125.697 | 0.385 | 28.241 |
| 3,000 | 1397.776 | 923.142 | 0.508 | 480.278 |
| 5,000 | 2153.727 | 2221.824 | 0.545 | 823.543 |
| 10,000 | 2471.275 | 2771.141 | 0.663 | 872.079 |

## Memory usage

| Scenario | Median heap after run (MB) | Peak RSS after run (MB) |
| --- | ---: | ---: |
| Parse (1 nodes) | 14.1 | 100.4 |
| Parse (3 nodes) | 16.4 | 105.9 |
| Parse (7 nodes) | 13.0 | 106.9 |
| Parse (15 nodes) | 13.8 | 107.5 |
| Parse (31 nodes) | 13.9 | 124.2 |
| Parse (63 nodes) | 28.9 | 115.4 |
| Bind unique (1,000) | 140.0 | 300.8 |
| Bind same expression (1,000) | 201.8 | 381.0 |
| Single update (1,000) | 268.7 | 475.0 |
| Bulk update (1,000) | 272.9 | 394.6 |
| Bind unique (3,000) | 610.1 | 925.0 |
| Bind same expression (3,000) | 802.2 | 1038.1 |
| Single update (3,000) | 1011.1 | 1270.2 |
| Bulk update (3,000) | 1021.6 | 1266.8 |
| Bind unique (5,000) | 1496.9 | 706.3 |
| Bind same expression (5,000) | 1754.2 | 1295.2 |
| Single update (5,000) | 2034.6 | 1955.4 |
| Bulk update (5,000) | 2051.9 | 1776.8 |
| Bind unique (10,000) | 2877.4 | 1117.4 |
| Bind same expression (10,000) | 3332.0 | 1638.1 |
| Single update (10,000) | 3760.3 | 1594.5 |
| Bulk update (10,000) | 3794.3 | 760.3 |
| Bind+initialize unique (1,000) | 251.3 | 411.1 |
| Bind+initialize same expression (1,000) | 305.5 | 471.9 |
| Bind+initialize unique (3,000) | 936.9 | 1226.6 |
| Bind+initialize same expression (3,000) | 1113.2 | 1293.4 |
| Bind+initialize unique (5,000) | 1957.2 | 1707.6 |
| Bind+initialize same expression (5,000) | 2187.7 | 2091.7 |
| Bind+initialize unique (10,000) | 3661.1 | 813.0 |
| Bind+initialize same expression (10,000) | 4051.2 | 927.2 |
| Identifier-only bind (100) | 3568.3 | 1647.7 |
| Identifier-only bind+initialize (100) | 3568.3 | 1129.6 |
| Identifier-only single update (100) | 3565.6 | 3989.9 |
| Identifier-only bulk update (100) | 3566.0 | 3640.6 |
| Identifier-only bind (500) | 3589.8 | 2799.2 |
| Identifier-only bind+initialize (500) | 3589.8 | 2995.7 |
| Identifier-only single update (500) | 3583.1 | 3726.3 |
| Identifier-only bulk update (500) | 3584.8 | 3471.9 |
| Identifier-only bind (1,000) | 3625.7 | 3153.6 |
| Identifier-only bind+initialize (1,000) | 3625.6 | 3074.4 |
| Identifier-only single update (1,000) | 3596.2 | 3684.5 |
| Identifier-only bulk update (1,000) | 3599.7 | 3622.1 |
| Identifier-only bind (3,000) | 3718.5 | 2977.4 |
| Identifier-only bind+initialize (3,000) | 3718.1 | 3714.2 |
| Identifier-only single update (3,000) | 3648.9 | 3310.8 |
| Identifier-only bulk update (3,000) | 3659.1 | 3620.5 |
| Identifier-only bind (5,000) | 3823.6 | 2745.0 |
| Identifier-only bind+initialize (5,000) | 3823.8 | 3874.5 |
| Identifier-only single update (5,000) | 3702.0 | 3527.5 |
| Identifier-only bulk update (5,000) | 3719.2 | 3432.4 |
| Identifier-only bind (10,000) | 4071.5 | 2907.5 |
| Identifier-only bind+initialize (10,000) | 4070.8 | 2563.5 |
| Identifier-only single update (10,000) | 3833.9 | 3668.8 |
| Identifier-only bulk update (10,000) | 3867.6 | 4012.3 |

