# rs-x core concepts performance benchmark

Generated at: 2026-03-30T21:05:39.408Z
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
| 1 | `v0` | 7.876 | 1.58 | 634850 |
| 3 | `v0 + v1` | 15.238 | 3.05 | 328124 |
| 7 | `v0 + v1 + v2 + v3` | 28.243 | 5.65 | 177033 |
| 15 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7` | 51.658 | 10.33 | 96791 |
| 31 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9 + v10 + v11 + v12 + v13 + v14 + v15` | 97.456 | 19.49 | 51305 |
| 63 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9 + v10 + v11 + v12 + v13 + v14 + v15 + v16 + v17 + v18 + v19 + v20 + v21 + v22 + v23 + v24 + v25 + v26 + v27 + v28 + v29 + v30 + v31` | 189.767 | 37.95 | 26348 |

## Parse cache behavior (parse+clone vs clone-only)

| Nodes | Parse+clone median (ms) | Parse+clone us/op | Clone-only median (ms) | Clone-only us/op |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 22.311 | 4.46 | 6.656 | 1.33 |
| 3 | 138.579 | 27.72 | 6.444 | 1.29 |
| 7 | 196.385 | 39.28 | 6.434 | 1.29 |
| 15 | 325.207 | 65.04 | 6.416 | 1.28 |
| 31 | 558.729 | 111.75 | 6.545 | 1.31 |
| 63 | 1052.414 | 210.48 | 6.599 | 1.32 |

## Binding performance (initial full evaluation)

| Bindings | Bind unique median (ms) | Bind same-expression median (ms) |
| ---: | ---: | ---: |
| 1,000 | 36.764 | 43.992 |
| 3,000 | 126.782 | 137.149 |
| 5,000 | 197.273 | 232.487 |
| 10,000 | 484.920 | 448.519 |

## Update performance (incremental reevaluation)

| Bindings | Single update median (ms) | Bulk update median (ms) |
| ---: | ---: | ---: |
| 1,000 | 0.099 | 8.531 |
| 3,000 | 0.083 | 36.148 |
| 5,000 | 0.084 | 55.912 |
| 10,000 | 0.079 | 95.421 |

## Binding performance (bind + initialize)

| Bindings | Bind+initialize unique median (ms) | Bind+initialize same-expression median (ms) |
| ---: | ---: | ---: |
| 1,000 | 41.315 | 47.028 |
| 3,000 | 120.170 | 135.532 |
| 5,000 | 156.624 | 213.308 |
| 10,000 | 481.173 | 430.112 |

## Identifier-only binding (single field, most common pattern)

| Bindings | Bind median (ms) | Bind+initialize median (ms) | Single update median (ms) | Bulk update median (ms) |
| ---: | ---: | ---: | ---: | ---: |
| 100 | 2.778 | 2.920 | 0.077 | 0.785 |
| 500 | 13.472 | 18.019 | 0.079 | 3.620 |
| 1,000 | 28.206 | 33.021 | 0.075 | 7.122 |
| 3,000 | 128.765 | 131.454 | 0.082 | 27.899 |
| 5,000 | 198.984 | 199.194 | 0.079 | 46.114 |
| 10,000 | 418.568 | 434.548 | 0.084 | 75.353 |

## Memory usage

| Scenario | Median heap after run (MB) | Peak RSS after run (MB) |
| --- | ---: | ---: |
| Parse (1 nodes) | 14.1 | 105.4 |
| Parse (3 nodes) | 16.3 | 111.1 |
| Parse (7 nodes) | 12.8 | 111.5 |
| Parse (15 nodes) | 13.8 | 111.7 |
| Parse (31 nodes) | 14.0 | 128.1 |
| Parse (63 nodes) | 29.0 | 128.5 |
| Bind unique (1,000) | 2016.3 | 2473.1 |
| Bind same expression (1,000) | 2028.5 | 2477.9 |
| Single update (1,000) | 2002.9 | 2481.1 |
| Bulk update (1,000) | 2007.9 | 2483.7 |
| Bind unique (3,000) | 2127.1 | 2588.6 |
| Bind same expression (3,000) | 2171.5 | 2600.6 |
| Single update (3,000) | 2106.5 | 2606.6 |
| Bulk update (3,000) | 2118.8 | 2609.7 |
| Bind unique (5,000) | 2301.1 | 2733.9 |
| Bind same expression (5,000) | 2420.2 | 2860.2 |
| Single update (5,000) | 2244.9 | 2839.7 |
| Bulk update (5,000) | 2265.1 | 2839.6 |
| Bind unique (10,000) | 2687.6 | 2984.3 |
| Bind same expression (10,000) | 2764.8 | 3051.5 |
| Single update (10,000) | 2547.0 | 3046.3 |
| Bulk update (10,000) | 2586.9 | 3047.9 |
| Bind+initialize unique (1,000) | 2017.6 | 2480.1 |
| Bind+initialize same expression (1,000) | 2029.6 | 2480.2 |
| Bind+initialize unique (3,000) | 2129.3 | 2610.1 |
| Bind+initialize same expression (3,000) | 2174.9 | 2606.5 |
| Bind+initialize unique (5,000) | 2352.3 | 2869.5 |
| Bind+initialize same expression (5,000) | 2370.3 | 2857.6 |
| Bind+initialize unique (10,000) | 2694.5 | 3086.3 |
| Bind+initialize same expression (10,000) | 2767.3 | 3054.6 |
| Identifier-only bind (100) | 2301.0 | 3043.3 |
| Identifier-only bind+initialize (100) | 2300.9 | 3044.4 |
| Identifier-only single update (100) | 2298.8 | 3045.0 |
| Identifier-only bulk update (100) | 2299.2 | 3045.3 |
| Identifier-only bind (500) | 2322.4 | 3045.4 |
| Identifier-only bind+initialize (500) | 2322.3 | 3056.0 |
| Identifier-only single update (500) | 2316.6 | 3050.7 |
| Identifier-only bulk update (500) | 2318.4 | 3050.4 |
| Identifier-only bind (1,000) | 2356.0 | 3053.5 |
| Identifier-only bind+initialize (1,000) | 2356.0 | 3053.4 |
| Identifier-only single update (1,000) | 2332.3 | 3053.0 |
| Identifier-only bulk update (1,000) | 2335.9 | 3054.4 |
| Identifier-only bind (3,000) | 2452.8 | 3065.3 |
| Identifier-only bind+initialize (3,000) | 2452.5 | 3055.8 |
| Identifier-only single update (3,000) | 2395.3 | 3056.1 |
| Identifier-only bulk update (3,000) | 2406.1 | 3056.2 |
| Identifier-only bind (5,000) | 2559.3 | 3062.0 |
| Identifier-only bind+initialize (5,000) | 2559.6 | 3063.1 |
| Identifier-only single update (5,000) | 2458.7 | 3063.2 |
| Identifier-only bulk update (5,000) | 2476.4 | 3063.7 |
| Identifier-only bind (10,000) | 2812.1 | 3258.8 |
| Identifier-only bind+initialize (10,000) | 2811.7 | 3422.9 |
| Identifier-only single update (10,000) | 2619.2 | 3400.4 |
| Identifier-only bulk update (10,000) | 2654.1 | 3401.7 |

