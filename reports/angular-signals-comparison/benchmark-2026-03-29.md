# Angular Signals vs rs-x comparison benchmark

Generated: 2026-03-29T08:47:34.619Z
Machine: Apple M4, 16.0 GB RAM, darwin/arm64
Node: v25.4.0

## Scenario 1 — Sync identifier

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 27.925 | 0.728 | 0.0751 | 0.0097 | 5.245 | 0.179 |
| 3,000 | 96.667 | 1.887 | 0.0741 | 0.0091 | 14.857 | 0.708 |
| 5,000 | 161.628 | 2.691 | 0.0721 | 0.0084 | 24.676 | 1.289 |
| 10,000 | 334.871 | 5.499 | 0.0721 | 0.0084 | 45.358 | 2.909 |

## Scenario 2 — Async identifier (BehaviorSubject)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 31.551 | 1.620 | 0.0528 | 0.0155 | 6.463 | 1.206 |
| 3,000 | 121.717 | 3.741 | 0.0484 | 0.0105 | 18.163 | 2.936 |
| 5,000 | 207.061 | 5.366 | 0.0541 | 0.0120 | 29.867 | 5.315 |
| 10,000 | 424.044 | 12.612 | 0.0544 | 0.0111 | 56.532 | 11.655 |

## Scenario 3 — Same-model expressions (1000 generated, cycled)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single-x update (ms) | ANG single-x update (ms) | RSX bulk-x (10×) (ms) | ANG bulk-x (10×) (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 359.270 | 0.626 | 50.657 | 1.096 | 396.585 | 9.627 |

