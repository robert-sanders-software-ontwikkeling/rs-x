# rs-x core concepts performance benchmark

Generated at: 2026-03-28T09:20:08.305Z
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
| 1 | `v0` | 4.015 | 0.80 | 1245472 |
| 3 | `v0 + v1` | 9.759 | 1.95 | 512334 |
| 7 | `v0 + v1 + v2 + v3` | 21.294 | 4.26 | 234812 |
| 15 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7` | 44.277 | 8.86 | 112926 |
| 31 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9 + v10 + v11 + v12 + v13 + v14 + v15` | 89.974 | 17.99 | 55572 |
| 63 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9 + v10 + v11 + v12 + v13 + v14 + v15 + v16 + v17 + v18 + v19 + v20 + v21 + v22 + v23 + v24 + v25 + v26 + v27 + v28 + v29 + v30 + v31` | 181.880 | 36.38 | 27491 |

## Parse cache behavior (parse+clone vs clone-only)

| Nodes | Parse+clone median (ms) | Parse+clone us/op | Clone-only median (ms) | Clone-only us/op |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 5.108 | 1.02 | 2.829 | 0.57 |
| 3 | 11.312 | 2.26 | 8.192 | 1.64 |
| 7 | 23.682 | 4.74 | 18.161 | 3.63 |
| 15 | 48.103 | 9.62 | 39.060 | 7.81 |
| 31 | 98.335 | 19.67 | 81.166 | 16.23 |
| 63 | 198.201 | 39.64 | 167.073 | 33.41 |

## Binding performance (initial full evaluation)

| Bindings | Bind unique median (ms) | Bind same-expression median (ms) |
| ---: | ---: | ---: |
| 1,000 | 37.953 | 49.136 |
| 3,000 | 116.509 | 138.636 |
| 5,000 | 196.705 | 208.961 |
| 10,000 | 422.299 | 420.085 |

## Update performance (incremental reevaluation)

| Bindings | Single update median (ms) | Bulk update median (ms) |
| ---: | ---: | ---: |
| 1,000 | 0.022 | 2.599 |
| 3,000 | 0.003 | 18.081 |
| 5,000 | 0.003 | 25.226 |
| 10,000 | 0.002 | 48.639 |

## Binding performance (bind + initialize)

| Bindings | Bind+initialize unique median (ms) | Bind+initialize same-expression median (ms) |
| ---: | ---: | ---: |
| 1,000 | 35.287 | 40.366 |
| 3,000 | 112.205 | 120.905 |
| 5,000 | 200.766 | 242.760 |
| 10,000 | 436.599 | 438.829 |

## Memory usage

| Scenario | Median heap after run (MB) | Peak RSS after run (MB) |
| --- | ---: | ---: |
| Parse (1 nodes) | 14.5 | 93.4 |
| Parse (3 nodes) | 14.1 | 99.6 |
| Parse (7 nodes) | 18.1 | 108.6 |
| Parse (15 nodes) | 18.4 | 109.8 |
| Parse (31 nodes) | 21.1 | 114.5 |
| Parse (63 nodes) | 24.1 | 164.8 |
| Bind unique (1,000) | 169.0 | 421.5 |
| Bind same expression (1,000) | 397.4 | 661.4 |
| Single update (1,000) | 67.3 | 979.1 |
| Bulk update (1,000) | 105.7 | 979.7 |
| Bind unique (3,000) | 471.0 | 1024.7 |
| Bind same expression (3,000) | 1049.4 | 1503.0 |
| Single update (3,000) | 626.4 | 1764.4 |
| Bulk update (3,000) | 652.3 | 1769.8 |
| Bind unique (5,000) | 1431.3 | 2004.0 |
| Bind same expression (5,000) | 783.9 | 2094.2 |
| Single update (5,000) | 1308.0 | 2610.0 |
| Bulk update (5,000) | 1353.9 | 2613.7 |
| Bind unique (10,000) | 1437.1 | 2764.7 |
| Bind same expression (10,000) | 1558.5 | 2656.9 |
| Single update (10,000) | 2382.0 | 2784.9 |
| Bulk update (10,000) | 2425.4 | 2787.9 |
| Bind+initialize unique (1,000) | 381.9 | 706.5 |
| Bind+initialize same expression (1,000) | 654.5 | 922.0 |
| Bind+initialize unique (3,000) | 1182.0 | 1654.9 |
| Bind+initialize same expression (3,000) | 597.3 | 1767.9 |
| Bind+initialize unique (5,000) | 1564.7 | 2166.4 |
| Bind+initialize same expression (5,000) | 932.7 | 2652.9 |
| Bind+initialize unique (10,000) | 1267.6 | 2720.6 |
| Bind+initialize same expression (10,000) | 1366.5 | 2769.0 |

