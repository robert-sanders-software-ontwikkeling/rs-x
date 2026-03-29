# Angular Signals vs rs-x comparison benchmark

Generated: 2026-03-29T07:15:29.114Z
Machine: Apple M4, 16.0 GB RAM, darwin/arm64
Node: v25.4.0

## Scenario 1 — Sync identifier

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 29.419 | 0.831 | 0.0929 | 0.0137 | 5.459 | 0.319 |
| 3,000 | 102.115 | 1.458 | 0.0738 | 0.0102 | 14.731 | 0.915 |
| 5,000 | 164.325 | 3.804 | 0.0743 | 0.0112 | 25.161 | 1.447 |
| 10,000 | 359.530 | 5.069 | 0.0875 | 0.0104 | 49.346 | 3.870 |

## Scenario 2 — Async identifier (BehaviorSubject)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 32.284 | 1.896 | 0.0507 | 0.0158 | 7.034 | 1.196 |
| 3,000 | 123.193 | 4.324 | 0.0666 | 0.0133 | 18.901 | 3.310 |
| 5,000 | 234.921 | 6.658 | 0.0667 | 0.0125 | 33.098 | 6.056 |
| 10,000 | 423.746 | 21.005 | 0.0658 | 0.0119 | 60.726 | 12.418 |

## Scenario 3 — Same-model expressions (1000 generated, cycled)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single-x update (ms) | ANG single-x update (ms) | RSX bulk-x (10×) (ms) | ANG bulk-x (10×) (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 414.255 | 0.911 | 112.135 | 1.168 | 986.121 | 11.850 |

