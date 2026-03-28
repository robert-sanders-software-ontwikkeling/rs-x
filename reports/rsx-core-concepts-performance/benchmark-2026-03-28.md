# rs-x core concepts performance benchmark

Generated at: 2026-03-28T11:50:51.274Z
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
| 1 | `v0` | 7.739 | 1.55 | 646054 |
| 3 | `v0 + v1` | 15.448 | 3.09 | 323676 |
| 7 | `v0 + v1 + v2 + v3` | 28.343 | 5.67 | 176413 |
| 15 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7` | 51.029 | 10.21 | 97983 |
| 31 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9 + v10 + v11 + v12 + v13 + v14 + v15` | 96.901 | 19.38 | 51599 |
| 63 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9 + v10 + v11 + v12 + v13 + v14 + v15 + v16 + v17 + v18 + v19 + v20 + v21 + v22 + v23 + v24 + v25 + v26 + v27 + v28 + v29 + v30 + v31` | 188.044 | 37.61 | 26589 |

## Parse cache behavior (parse+clone vs clone-only)

| Nodes | Parse+clone median (ms) | Parse+clone us/op | Clone-only median (ms) | Clone-only us/op |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 9.059 | 1.81 | 2.790 | 0.56 |
| 3 | 16.833 | 3.37 | 8.192 | 1.64 |
| 7 | 30.720 | 6.14 | 18.223 | 3.64 |
| 15 | 56.334 | 11.27 | 38.617 | 7.72 |
| 31 | 104.802 | 20.96 | 80.386 | 16.08 |
| 63 | 202.282 | 40.46 | 165.061 | 33.01 |

## Binding performance (initial full evaluation)

| Bindings | Bind unique median (ms) | Bind same-expression median (ms) |
| ---: | ---: | ---: |
| 1,000 | 39.796 | 35.739 |
| 3,000 | 139.469 | 142.377 |
| 5,000 | 227.426 | 239.175 |
| 10,000 | 546.247 | 475.082 |

## Update performance (incremental reevaluation)

| Bindings | Single update median (ms) | Bulk update median (ms) |
| ---: | ---: | ---: |
| 1,000 | 0.068 | 5.946 |
| 3,000 | 0.066 | 18.598 |
| 5,000 | 0.078 | 32.433 |
| 10,000 | 0.073 | 59.928 |

## Binding performance (bind + initialize)

| Bindings | Bind+initialize unique median (ms) | Bind+initialize same-expression median (ms) |
| ---: | ---: | ---: |
| 1,000 | 35.713 | 36.117 |
| 3,000 | 122.625 | 137.564 |
| 5,000 | 265.686 | 241.613 |
| 10,000 | 471.350 | 463.920 |

## Identifier-only binding (single field, most common pattern)

| Bindings | Bind median (ms) | Bind+initialize median (ms) | Single update median (ms) | Bulk update median (ms) |
| ---: | ---: | ---: | ---: | ---: |
| 100 | 5.438 | 3.642 | 0.067 | 0.850 |
| 500 | 15.296 | 16.851 | 0.064 | 4.067 |
| 1,000 | 28.958 | 29.027 | 0.065 | 7.521 |
| 3,000 | 102.882 | 104.762 | 0.067 | 18.631 |
| 5,000 | 175.141 | 175.905 | 0.067 | 28.075 |
| 10,000 | 341.751 | 342.662 | 0.081 | 52.867 |

## Memory usage

| Scenario | Median heap after run (MB) | Peak RSS after run (MB) |
| --- | ---: | ---: |
| Parse (1 nodes) | 14.1 | 93.5 |
| Parse (3 nodes) | 12.5 | 99.2 |
| Parse (7 nodes) | 14.7 | 108.2 |
| Parse (15 nodes) | 19.2 | 108.8 |
| Parse (31 nodes) | 19.0 | 125.4 |
| Parse (63 nodes) | 25.0 | 125.9 |
| Bind unique (1,000) | 160.0 | 360.8 |
| Bind same expression (1,000) | 152.4 | 370.4 |
| Single update (1,000) | 64.6 | 386.8 |
| Bulk update (1,000) | 70.1 | 386.8 |
| Bind unique (3,000) | 441.0 | 771.4 |
| Bind same expression (3,000) | 416.3 | 793.6 |
| Single update (3,000) | 171.0 | 810.2 |
| Bulk update (3,000) | 185.3 | 809.6 |
| Bind unique (5,000) | 685.3 | 1075.8 |
| Bind same expression (5,000) | 641.4 | 1085.1 |
| Single update (5,000) | 282.9 | 1101.1 |
| Bulk update (5,000) | 306.6 | 1102.0 |
| Bind unique (10,000) | 1185.4 | 1603.6 |
| Bind same expression (10,000) | 1169.6 | 1672.3 |
| Single update (10,000) | 554.4 | 1693.8 |
| Bulk update (10,000) | 601.3 | 1694.4 |
| Bind+initialize unique (1,000) | 162.0 | 385.6 |
| Bind+initialize same expression (1,000) | 151.6 | 386.7 |
| Bind+initialize unique (3,000) | 445.3 | 826.4 |
| Bind+initialize same expression (3,000) | 414.7 | 805.5 |
| Bind+initialize unique (5,000) | 694.9 | 1117.0 |
| Bind+initialize same expression (5,000) | 640.3 | 1097.7 |
| Bind+initialize unique (10,000) | 1208.6 | 1732.9 |
| Bind+initialize same expression (10,000) | 1169.1 | 1692.4 |
| Identifier-only bind (100) | 193.1 | 1684.8 |
| Identifier-only bind+initialize (100) | 193.1 | 1685.0 |
| Identifier-only single update (100) | 190.1 | 1685.0 |
| Identifier-only bulk update (100) | 190.6 | 1685.3 |
| Identifier-only bind (500) | 217.9 | 1685.4 |
| Identifier-only bind+initialize (500) | 217.7 | 1692.5 |
| Identifier-only single update (500) | 205.9 | 1688.4 |
| Identifier-only bulk update (500) | 208.4 | 1688.4 |
| Identifier-only bind (1,000) | 254.2 | 1688.5 |
| Identifier-only bind+initialize (1,000) | 254.1 | 1688.0 |
| Identifier-only single update (1,000) | 221.3 | 1688.0 |
| Identifier-only bulk update (1,000) | 226.0 | 1688.0 |
| Identifier-only bind (3,000) | 361.4 | 1695.2 |
| Identifier-only bind+initialize (3,000) | 361.2 | 1688.1 |
| Identifier-only single update (3,000) | 283.0 | 1663.5 |
| Identifier-only bulk update (3,000) | 296.9 | 1663.5 |
| Identifier-only bind (5,000) | 458.6 | 1669.3 |
| Identifier-only bind+initialize (5,000) | 458.4 | 1670.3 |
| Identifier-only single update (5,000) | 345.3 | 1670.7 |
| Identifier-only bulk update (5,000) | 368.3 | 1671.0 |
| Identifier-only bind (10,000) | 753.3 | 1691.5 |
| Identifier-only bind+initialize (10,000) | 752.9 | 1681.7 |
| Identifier-only single update (10,000) | 499.9 | 1639.0 |
| Identifier-only bulk update (10,000) | 544.8 | 1534.8 |

