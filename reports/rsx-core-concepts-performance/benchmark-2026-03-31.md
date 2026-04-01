# rs-x core concepts performance benchmark

Generated at: 2026-03-31T12:24:18.333Z
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
| 1 | `v0` | 3.854 | 0.77 | 1297255 |
| 3 | `v0 + v1` | 9.435 | 1.89 | 529963 |
| 7 | `v0 + v1 + v2 + v3` | 20.438 | 4.09 | 244638 |
| 15 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7` | 43.392 | 8.68 | 115228 |
| 31 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9 + v10 + v11 + v12 + v13 + v14 + v15` | 88.829 | 17.77 | 56288 |
| 63 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9 + v10 + v11 + v12 + v13 + v14 + v15 + v16 + v17 + v18 + v19 + v20 + v21 + v22 + v23 + v24 + v25 + v26 + v27 + v28 + v29 + v30 + v31` | 178.875 | 35.77 | 27953 |

## Parse cache behavior (parse+clone vs clone-only)

| Nodes | Parse+clone median (ms) | Parse+clone us/op | Clone-only median (ms) | Clone-only us/op |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 20.065 | 4.01 | 6.763 | 1.35 |
| 3 | 127.486 | 25.50 | 6.202 | 1.24 |
| 7 | 185.001 | 37.00 | 6.167 | 1.23 |
| 15 | 298.874 | 59.77 | 6.315 | 1.26 |
| 31 | 513.151 | 102.63 | 6.439 | 1.29 |
| 63 | 997.001 | 199.40 | 6.683 | 1.34 |

## Binding performance (initial full evaluation)

| Bindings | Bind unique median (ms) | Bind same-expression median (ms) |
| ---: | ---: | ---: |
| 1,000 | 32.317 | 45.661 |
| 3,000 | 106.509 | 157.647 |
| 5,000 | 193.635 | 247.696 |
| 10,000 | 561.750 | 440.759 |

## Update performance (incremental reevaluation)

| Bindings | Single update median (ms) | Bulk update median (ms) |
| ---: | ---: | ---: |
| 1,000 | 0.008 | 2.873 |
| 3,000 | 0.003 | 18.277 |
| 5,000 | 0.002 | 28.310 |
| 10,000 | 0.002 | 61.112 |

## Binding performance (bind + initialize)

| Bindings | Bind+initialize unique median (ms) | Bind+initialize same-expression median (ms) |
| ---: | ---: | ---: |
| 1,000 | 35.544 | 43.860 |
| 3,000 | 103.401 | 107.878 |
| 5,000 | 133.906 | 219.792 |
| 10,000 | 584.796 | 516.751 |

## Identifier-only binding (single field, most common pattern)

| Bindings | Bind median (ms) | Bind+initialize median (ms) | Single update median (ms) | Bulk update median (ms) |
| ---: | ---: | ---: | ---: | ---: |
| 100 | 1.785 | 1.797 | 0.002 | 0.157 |
| 500 | 19.227 | 18.441 | 0.002 | 0.714 |
| 1,000 | 30.449 | 32.750 | 0.001 | 1.789 |
| 3,000 | 114.475 | 109.355 | 0.002 | 11.823 |
| 5,000 | 157.992 | 196.971 | 0.002 | 22.742 |
| 10,000 | 358.121 | 338.662 | 0.003 | 45.661 |

## Memory usage

| Scenario | Median heap after run (MB) | Peak RSS after run (MB) |
| --- | ---: | ---: |
| Parse (1 nodes) | 20.8 | 105.1 |
| Parse (3 nodes) | 18.2 | 111.4 |
| Parse (7 nodes) | 18.7 | 111.9 |
| Parse (15 nodes) | 18.2 | 113.1 |
| Parse (31 nodes) | 21.1 | 131.8 |
| Parse (63 nodes) | 23.0 | 136.0 |
| Bind unique (1,000) | 2498.8 | 2947.3 |
| Bind same expression (1,000) | 2673.7 | 3000.5 |
| Single update (1,000) | 3137.2 | 3002.9 |
| Bulk update (1,000) | 3152.7 | 3022.7 |
| Bind unique (3,000) | 3532.9 | 3265.3 |
| Bind same expression (3,000) | 3973.4 | 3895.9 |
| Single update (3,000) | 3675.7 | 4011.0 |
| Bulk update (3,000) | 3707.6 | 4007.4 |
| Bind unique (5,000) | 4320.8 | 2970.0 |
| Bind same expression (5,000) | 2683.1 | 3697.7 |
| Single update (5,000) | 4515.8 | 2078.9 |
| Bulk update (5,000) | 4557.3 | 2063.8 |
| Bind unique (10,000) | 2780.8 | 3992.0 |
| Bind same expression (10,000) | 4386.8 | 4205.5 |
| Single update (10,000) | 2154.7 | 3897.4 |
| Bulk update (10,000) | 2201.3 | 3906.6 |
| Bind+initialize unique (1,000) | 2830.1 | 2970.2 |
| Bind+initialize same expression (1,000) | 3024.9 | 3006.8 |
| Bind+initialize unique (3,000) | 2624.1 | 3987.1 |
| Bind+initialize same expression (3,000) | 3306.2 | 4029.8 |
| Bind+initialize unique (5,000) | 3225.0 | 3321.6 |
| Bind+initialize same expression (5,000) | 4021.6 | 3098.1 |
| Bind+initialize unique (10,000) | 2949.8 | 4229.1 |
| Bind+initialize same expression (10,000) | 4557.0 | 1805.2 |
| Identifier-only bind (100) | 2270.7 | 3915.4 |
| Identifier-only bind+initialize (100) | 2297.4 | 3917.4 |
| Identifier-only single update (100) | 2308.1 | 3921.4 |
| Identifier-only bulk update (100) | 2311.4 | 3921.9 |
| Identifier-only bind (500) | 2438.8 | 3933.4 |
| Identifier-only bind+initialize (500) | 2622.4 | 3950.7 |
| Identifier-only single update (500) | 2714.2 | 3943.5 |
| Identifier-only bulk update (500) | 2716.8 | 3946.3 |
| Identifier-only bind (1,000) | 2963.9 | 3931.8 |
| Identifier-only bind+initialize (1,000) | 3325.5 | 3881.4 |
| Identifier-only single update (1,000) | 3481.5 | 3839.9 |
| Identifier-only bulk update (1,000) | 3494.6 | 3853.0 |
| Identifier-only bind (3,000) | 4128.5 | 3582.4 |
| Identifier-only bind+initialize (3,000) | 4791.3 | 4383.5 |
| Identifier-only single update (3,000) | 1514.1 | 4394.7 |
| Identifier-only bulk update (3,000) | 1541.3 | 4404.5 |
| Identifier-only bind (5,000) | 2674.1 | 4450.8 |
| Identifier-only bind+initialize (5,000) | 3985.9 | 4097.1 |
| Identifier-only single update (5,000) | 890.6 | 3623.5 |
| Identifier-only bulk update (5,000) | 927.9 | 3635.3 |
| Identifier-only bind (10,000) | 1693.9 | 3709.0 |
| Identifier-only bind+initialize (10,000) | 2041.4 | 3770.0 |
| Identifier-only single update (10,000) | 767.9 | 3670.4 |
| Identifier-only bulk update (10,000) | 818.1 | 3622.6 |

