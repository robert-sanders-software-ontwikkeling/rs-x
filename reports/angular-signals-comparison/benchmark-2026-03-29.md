# Angular Signals vs rs-x comparison benchmark

Generated: 2026-03-29T12:07:38.008Z
Machine: Apple M4, 16.0 GB RAM, darwin/arm64
Node: v25.4.0

## Scenario 1 — Sync identifier

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 28.157 | 0.729 | 0.0789 | 0.0090 | 5.319 | 0.182 |
| 3,000 | 95.583 | 1.667 | 0.0679 | 0.0081 | 15.094 | 0.744 |
| 5,000 | 164.432 | 2.593 | 0.0711 | 0.0082 | 24.601 | 1.478 |
| 10,000 | 355.566 | 4.666 | 0.0793 | 0.0099 | 47.069 | 2.822 |

## Scenario 2 — Async identifier (BehaviorSubject)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 31.313 | 1.888 | 0.0548 | 0.0151 | 6.550 | 1.265 |
| 3,000 | 122.221 | 4.236 | 0.0531 | 0.0109 | 18.724 | 2.446 |
| 5,000 | 207.200 | 5.051 | 0.0547 | 0.0112 | 30.068 | 4.720 |
| 10,000 | 421.509 | 12.916 | 0.0578 | 0.0110 | 55.599 | 10.483 |

## Scenario 3 — Same-model expressions (1000 generated, cycled)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single-x update (ms) | ANG single-x update (ms) | RSX bulk-x (10×) (ms) | ANG bulk-x (10×) (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 359.822 | 0.677 | 49.641 | 1.090 | 393.809 | 8.474 |

