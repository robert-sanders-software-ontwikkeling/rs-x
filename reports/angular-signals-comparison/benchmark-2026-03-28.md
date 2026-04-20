# Angular Signals vs rs-x comparison benchmark

Generated: 2026-03-28T22:25:25.140Z
Machine: Apple M4, 16.0 GB RAM, darwin/arm64
Node: v25.4.0

## Scenario 1 — Sync identifier

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 29.714 | 0.725 | 0.1042 | 0.0135 | 6.027 | 0.279 |
| 3,000 | 105.733 | 1.787 | 0.0846 | 0.0106 | 16.813 | 1.061 |
| 5,000 | 174.539 | 2.923 | 0.0825 | 0.0103 | 27.989 | 1.593 |
| 10,000 | 355.277 | 5.746 | 0.0814 | 0.0105 | 53.958 | 3.174 |

## Scenario 2 — Async identifier (BehaviorSubject)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 32.792 | 2.342 | 0.0587 | 0.0194 | 7.411 | 1.394 |
| 3,000 | 133.847 | 5.312 | 0.0614 | 0.0122 | 20.403 | 3.145 |
| 5,000 | 223.069 | 7.380 | 0.0658 | 0.0115 | 33.501 | 5.684 |
| 10,000 | 446.896 | 17.223 | 0.0680 | 0.0132 | 66.412 | 8.482 |

## Scenario 3 — Same-model expressions (1000 generated, cycled)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single-x update (ms) | ANG single-x update (ms) | RSX bulk-x (10×) (ms) | ANG bulk-x (10×) (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 401.669 | 0.651 | 109.038 | 1.174 | 967.362 | 11.278 |

