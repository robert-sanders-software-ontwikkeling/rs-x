# rs-x core concepts performance benchmark

Generated at: 2026-03-28T08:59:30.316Z
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
| 1 | `v0` | 3.870 | 0.77 | 1292059 |
| 3 | `v0 + v1` | 9.626 | 1.93 | 519442 |
| 7 | `v0 + v1 + v2 + v3` | 21.191 | 4.24 | 235949 |
| 15 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7` | 43.774 | 8.75 | 114222 |
| 31 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9 + v10 + v11 + v12 + v13 + v14 + v15` | 90.119 | 18.02 | 55482 |
| 63 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9 + v10 + v11 + v12 + v13 + v14 + v15 + v16 + v17 + v18 + v19 + v20 + v21 + v22 + v23 + v24 + v25 + v26 + v27 + v28 + v29 + v30 + v31` | 182.876 | 36.58 | 27341 |

## Parse cache behavior (parse+clone vs clone-only)

| Nodes | Parse+clone median (ms) | Parse+clone us/op | Clone-only median (ms) | Clone-only us/op |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 5.119 | 1.02 | 2.761 | 0.55 |
| 3 | 11.121 | 2.22 | 8.184 | 1.64 |
| 7 | 23.364 | 4.67 | 18.073 | 3.61 |
| 15 | 47.527 | 9.51 | 38.945 | 7.79 |
| 31 | 97.340 | 19.47 | 80.544 | 16.11 |
| 63 | 195.308 | 39.06 | 166.571 | 33.31 |

## Binding performance (initial full evaluation)

| Bindings | Bind unique median (ms) | Bind same-expression median (ms) |
| ---: | ---: | ---: |
| 1,000 | 38.618 | 44.304 |
| 3,000 | 123.024 | 129.090 |
| 5,000 | 225.255 | 287.689 |
| 10,000 | 454.797 | 448.522 |

## Update performance (incremental reevaluation)

| Bindings | Single update median (ms) | Bulk update median (ms) |
| ---: | ---: | ---: |
| 1,000 | 0.008 | 2.622 |
| 3,000 | 0.003 | 12.111 |
| 5,000 | 0.002 | 25.434 |
| 10,000 | 0.002 | 46.038 |

## Binding performance (bind + initialize)

| Bindings | Bind+initialize unique median (ms) | Bind+initialize same-expression median (ms) |
| ---: | ---: | ---: |
| 1,000 | 35.473 | 42.562 |
| 3,000 | 120.872 | 127.481 |
| 5,000 | 215.087 | 203.856 |
| 10,000 | 433.733 | 422.661 |

## Memory usage

| Scenario | Median heap after run (MB) | Peak RSS after run (MB) |
| --- | ---: | ---: |
| Parse (1 nodes) | 14.4 | 91.4 |
| Parse (3 nodes) | 14.0 | 96.8 |
| Parse (7 nodes) | 15.4 | 105.4 |
| Parse (15 nodes) | 18.6 | 106.7 |
| Parse (31 nodes) | 19.7 | 111.5 |
| Parse (63 nodes) | 24.5 | 162.2 |
| Bind unique (1,000) | 170.7 | 419.0 |
| Bind same expression (1,000) | 181.1 | 526.4 |
| Single update (1,000) | 546.2 | 724.1 |
| Bulk update (1,000) | 562.6 | 771.5 |
| Bind unique (3,000) | 512.7 | 1011.1 |
| Bind same expression (3,000) | 525.0 | 1208.5 |
| Single update (3,000) | 1004.9 | 1235.4 |
| Bulk update (3,000) | 1033.9 | 1255.3 |
| Bind unique (5,000) | 684.9 | 1361.8 |
| Bind same expression (5,000) | 1916.4 | 2320.8 |
| Single update (5,000) | 333.7 | 2549.3 |
| Bulk update (5,000) | 363.8 | 2552.5 |
| Bind unique (10,000) | 1311.0 | 2669.2 |
| Bind same expression (10,000) | 1384.8 | 2612.0 |
| Single update (10,000) | 631.4 | 2633.4 |
| Bulk update (10,000) | 678.4 | 2636.9 |
| Bind+initialize unique (1,000) | 354.8 | 635.3 |
| Bind+initialize same expression (1,000) | 400.8 | 687.2 |
| Bind+initialize unique (3,000) | 519.1 | 1271.5 |
| Bind+initialize same expression (3,000) | 550.2 | 1234.5 |
| Bind+initialize unique (5,000) | 782.6 | 2503.7 |
| Bind+initialize same expression (5,000) | 1902.1 | 2584.9 |
| Bind+initialize unique (10,000) | 1406.3 | 2722.3 |
| Bind+initialize same expression (10,000) | 1573.8 | 2630.7 |

