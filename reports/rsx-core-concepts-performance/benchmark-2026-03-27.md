# rs-x core concepts performance benchmark

Generated at: 2026-03-27T23:59:18.475Z
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
| 1 | `v0` | 8.660 | 1.73 | 577356 |
| 3 | `v0 + v1` | 16.561 | 3.31 | 301913 |
| 7 | `v0 + v1 + v2 + v3` | 29.713 | 5.94 | 168275 |
| 15 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7` | 54.357 | 10.87 | 91984 |
| 31 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9 + v10 + v11 + v12 + v13 + v14 + v15` | 102.160 | 20.43 | 48943 |
| 63 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9 + v10 + v11 + v12 + v13 + v14 + v15 + v16 + v17 + v18 + v19 + v20 + v21 + v22 + v23 + v24 + v25 + v26 + v27 + v28 + v29 + v30 + v31` | 202.210 | 40.44 | 24727 |

## Parse cache behavior (parse+clone vs clone-only)

| Nodes | Parse+clone median (ms) | Parse+clone us/op | Clone-only median (ms) | Clone-only us/op |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 9.470 | 1.89 | 3.038 | 0.61 |
| 3 | 17.560 | 3.51 | 8.453 | 1.69 |
| 7 | 33.757 | 6.75 | 18.952 | 3.79 |
| 15 | 60.619 | 12.12 | 40.456 | 8.09 |
| 31 | 117.579 | 23.52 | 84.112 | 16.82 |
| 63 | 238.671 | 47.73 | 176.919 | 35.38 |

## Binding performance (initial full evaluation)

| Bindings | Bind unique median (ms) | Bind same-expression median (ms) |
| ---: | ---: | ---: |
| 1,000 | 43.624 | 38.315 |
| 3,000 | 168.559 | 179.380 |
| 5,000 | 274.110 | 295.918 |
| 10,000 | 555.415 | 610.210 |

## Update performance (incremental reevaluation)

| Bindings | Single update median (ms) | Bulk update median (ms) |
| ---: | ---: | ---: |
| 1,000 | 0.117 | 7.216 |
| 3,000 | 0.084 | 22.196 |
| 5,000 | 0.092 | 35.752 |
| 10,000 | 0.093 | 69.064 |

## Binding performance (bind + initialize)

| Bindings | Bind+initialize unique median (ms) | Bind+initialize same-expression median (ms) |
| ---: | ---: | ---: |
| 1,000 | 44.263 | 39.925 |
| 3,000 | 149.150 | 168.244 |
| 5,000 | 273.164 | 292.077 |
| 10,000 | 508.248 | 544.795 |

## Memory usage

| Scenario | Median heap after run (MB) | Peak RSS after run (MB) |
| --- | ---: | ---: |
| Parse (1 nodes) | 14.2 | 81.9 |
| Parse (3 nodes) | 12.5 | 89.0 |
| Parse (7 nodes) | 14.7 | 98.6 |
| Parse (15 nodes) | 19.2 | 100.5 |
| Parse (31 nodes) | 18.9 | 116.9 |
| Parse (63 nodes) | 25.1 | 119.9 |
| Bind unique (1,000) | 160.1 | 357.0 |
| Bind same expression (1,000) | 152.5 | 366.0 |
| Single update (1,000) | 64.6 | 381.5 |
| Bulk update (1,000) | 70.2 | 381.4 |
| Bind unique (3,000) | 441.1 | 778.8 |
| Bind same expression (3,000) | 416.4 | 802.3 |
| Single update (3,000) | 171.1 | 821.4 |
| Bulk update (3,000) | 185.4 | 821.2 |
| Bind unique (5,000) | 685.5 | 1089.6 |
| Bind same expression (5,000) | 641.6 | 1109.2 |
| Single update (5,000) | 283.0 | 1120.4 |
| Bulk update (5,000) | 306.7 | 1120.6 |
| Bind unique (10,000) | 1186.8 | 1568.2 |
| Bind same expression (10,000) | 1169.8 | 1684.7 |
| Single update (10,000) | 553.2 | 1706.2 |
| Bulk update (10,000) | 600.2 | 1706.4 |
| Bind+initialize unique (1,000) | 162.1 | 380.9 |
| Bind+initialize same expression (1,000) | 151.8 | 381.3 |
| Bind+initialize unique (3,000) | 445.4 | 839.8 |
| Bind+initialize same expression (3,000) | 414.9 | 818.8 |
| Bind+initialize unique (5,000) | 695.1 | 1145.0 |
| Bind+initialize same expression (5,000) | 639.7 | 1121.5 |
| Bind+initialize unique (10,000) | 1207.0 | 1765.6 |
| Bind+initialize same expression (10,000) | 1167.6 | 1712.6 |

