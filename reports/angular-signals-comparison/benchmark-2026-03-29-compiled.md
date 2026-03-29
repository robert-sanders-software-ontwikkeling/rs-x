# Angular Signals vs rs-x comparison benchmark

Generated: 2026-03-29T12:06:35.529Z
Machine: Apple M4, 16.0 GB RAM, darwin/arm64
Node: v25.4.0

## Scenario 1 — Sync identifier

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 26.927 | 0.833 | 0.0936 | 0.0093 | 5.130 | 0.202 |
| 3,000 | 94.933 | 1.798 | 0.0709 | 0.0076 | 14.551 | 0.797 |
| 5,000 | 161.360 | 2.812 | 0.0715 | 0.0100 | 24.289 | 1.375 |
| 10,000 | 327.441 | 5.321 | 0.0812 | 0.0093 | 45.276 | 2.769 |

## Scenario 2 — Async identifier (BehaviorSubject)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 31.476 | 1.760 | 0.0460 | 0.0165 | 6.666 | 1.278 |
| 3,000 | 120.531 | 3.029 | 0.0540 | 0.0106 | 18.406 | 2.601 |
| 5,000 | 206.911 | 7.154 | 0.0527 | 0.0114 | 29.603 | 3.065 |
| 10,000 | 408.693 | 13.955 | 0.0599 | 0.0108 | 55.275 | 8.210 |

## Scenario 3 — Same-model expressions (1000 generated, cycled)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single-x update (ms) | ANG single-x update (ms) | RSX bulk-x (10×) (ms) | ANG bulk-x (10×) (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 10.984 | 0.701 | 3.945 | 1.071 | 21.830 | 9.039 |

