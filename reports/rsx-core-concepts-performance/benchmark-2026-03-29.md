# rs-x core concepts performance benchmark

Generated at: 2026-03-29T15:33:46.800Z
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
| 1 | `v0` | 8.517 | 1.70 | 587070 |
| 3 | `v0 + v1` | 19.204 | 3.84 | 260366 |
| 7 | `v0 + v1 + v2 + v3` | 32.518 | 6.50 | 153760 |
| 15 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7` | 57.977 | 11.60 | 86240 |
| 31 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9 + v10 + v11 + v12 + v13 + v14 + v15` | 109.552 | 21.91 | 45640 |
| 63 | `v0 + v1 + v2 + v3 + v4 + v5 + v6 + v7 + v8 + v9 + v10 + v11 + v12 + v13 + v14 + v15 + v16 + v17 + v18 + v19 + v20 + v21 + v22 + v23 + v24 + v25 + v26 + v27 + v28 + v29 + v30 + v31` | 232.788 | 46.56 | 21479 |

## Parse cache behavior (parse+clone vs clone-only)

| Nodes | Parse+clone median (ms) | Parse+clone us/op | Clone-only median (ms) | Clone-only us/op |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 17.866 | 3.57 | 3.229 | 0.65 |
| 3 | 48.166 | 9.63 | 4.891 | 0.98 |
| 7 | 58.030 | 11.61 | 5.815 | 1.16 |
| 15 | 77.805 | 15.56 | 6.095 | 1.22 |
| 31 | 103.473 | 20.69 | 5.428 | 1.09 |
| 63 | 185.062 | 37.01 | 6.933 | 1.39 |

## Binding performance (initial full evaluation)

| Bindings | Bind unique median (ms) | Bind same-expression median (ms) |
| ---: | ---: | ---: |
| 1,000 | 71.768 | 57.621 |
| 3,000 | 205.321 | 225.482 |
| 5,000 | 365.716 | 403.214 |
| 10,000 | 940.382 | 1923.304 |

## Update performance (incremental reevaluation)

| Bindings | Single update median (ms) | Bulk update median (ms) |
| ---: | ---: | ---: |
| 1,000 | 0.123 | 12.935 |
| 3,000 | 0.103 | 42.062 |
| 5,000 | 0.093 | 73.532 |
| 10,000 | 0.622 | 1592.432 |

## Binding performance (bind + initialize)

| Bindings | Bind+initialize unique median (ms) | Bind+initialize same-expression median (ms) |
| ---: | ---: | ---: |
| 1,000 | 55.339 | 57.899 |
| 3,000 | 199.704 | 236.540 |
| 5,000 | 394.962 | 436.433 |
| 10,000 | 2307.455 | 3800.484 |

## Identifier-only binding (single field, most common pattern)

| Bindings | Bind median (ms) | Bind+initialize median (ms) | Single update median (ms) | Bulk update median (ms) |
| ---: | ---: | ---: | ---: | ---: |
| 100 | 19.144 | 32.621 | 0.160 | 1.896 |
| 500 | 64.783 | 62.695 | 0.150 | 6.429 |
| 1,000 | 173.514 | 103.440 | 0.226 | 22.256 |
| 3,000 | 1276.545 | 412.611 | 0.121 | 52.454 |
| 5,000 | 507.538 | 918.566 | 0.188 | 146.375 |
| 10,000 | 2044.020 | 879.275 | 0.137 | 209.071 |

## Memory usage

| Scenario | Median heap after run (MB) | Peak RSS after run (MB) |
| --- | ---: | ---: |
| Parse (1 nodes) | 14.0 | 101.5 |
| Parse (3 nodes) | 16.3 | 107.4 |
| Parse (7 nodes) | 12.8 | 108.1 |
| Parse (15 nodes) | 13.6 | 109.1 |
| Parse (31 nodes) | 13.9 | 125.8 |
| Parse (63 nodes) | 28.9 | 127.2 |
| Bind unique (1,000) | 539.7 | 822.9 |
| Bind same expression (1,000) | 618.2 | 894.2 |
| Single update (1,000) | 735.7 | 1038.1 |
| Bulk update (1,000) | 740.4 | 1039.3 |
| Bind unique (3,000) | 1052.0 | 1421.7 |
| Bind same expression (3,000) | 1278.2 | 1614.8 |
| Single update (3,000) | 1655.0 | 2035.1 |
| Bulk update (3,000) | 1666.4 | 1951.2 |
| Bind unique (5,000) | 2088.6 | 2477.5 |
| Bind same expression (5,000) | 2410.2 | 2779.3 |
| Single update (5,000) | 2923.3 | 3362.8 |
| Bulk update (5,000) | 2941.9 | 3213.9 |
| Bind unique (10,000) | 3702.9 | 3454.1 |
| Bind same expression (10,000) | 4256.5 | 3176.4 |
| Single update (10,000) | 5051.0 | 3262.1 |
| Bulk update (10,000) | 5088.0 | 3427.9 |
| Bind+initialize unique (1,000) | 678.4 | 976.5 |
| Bind+initialize same expression (1,000) | 749.0 | 1035.2 |
| Bind+initialize unique (3,000) | 1461.4 | 1846.8 |
| Bind+initialize same expression (3,000) | 1671.6 | 2021.0 |
| Bind+initialize unique (5,000) | 2664.3 | 3090.8 |
| Bind+initialize same expression (5,000) | 2958.3 | 3347.7 |
| Bind+initialize unique (10,000) | 4672.5 | 3419.7 |
| Bind+initialize same expression (10,000) | 5161.4 | 2863.8 |
| Identifier-only bind (100) | 4773.7 | 3584.4 |
| Identifier-only bind+initialize (100) | 4773.7 | 3442.7 |
| Identifier-only single update (100) | 4770.8 | 5400.0 |
| Identifier-only bulk update (100) | 4771.2 | 5387.5 |
| Identifier-only bind (500) | 4797.5 | 5421.2 |
| Identifier-only bind+initialize (500) | 4797.5 | 5460.8 |
| Identifier-only single update (500) | 4789.6 | 5390.1 |
| Identifier-only bulk update (500) | 4791.4 | 5403.8 |
| Identifier-only bind (1,000) | 4836.7 | 5122.4 |
| Identifier-only bind+initialize (1,000) | 4836.7 | 5427.7 |
| Identifier-only single update (1,000) | 4804.3 | 5365.8 |
| Identifier-only bulk update (1,000) | 4808.0 | 5372.2 |
| Identifier-only bind (3,000) | 4941.7 | 5438.7 |
| Identifier-only bind+initialize (3,000) | 4941.4 | 5510.1 |
| Identifier-only single update (3,000) | 4863.3 | 5397.0 |
| Identifier-only bulk update (3,000) | 4874.2 | 5423.1 |
| Identifier-only bind (5,000) | 5060.9 | 5553.8 |
| Identifier-only bind+initialize (5,000) | 5061.1 | 5518.2 |
| Identifier-only single update (5,000) | 4922.8 | 5381.5 |
| Identifier-only bulk update (5,000) | 4940.9 | 5402.3 |
| Identifier-only bind (10,000) | 5329.8 | 4958.3 |
| Identifier-only bind+initialize (10,000) | 5329.5 | 5753.1 |
| Identifier-only single update (10,000) | 5070.3 | 5502.7 |
| Identifier-only bulk update (10,000) | 5105.0 | 5501.1 |

