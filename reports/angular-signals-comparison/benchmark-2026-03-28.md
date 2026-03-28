# Angular Signals vs rs-x comparison benchmark

Generated: 2026-03-28T13:38:28.539Z
Machine: Apple M4, 16.0 GB RAM, darwin/arm64
Node: v25.4.0

## Scenario 1 — Sync identifier

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 28.474 | 0.744 | 0.0979 | 0.0121 | 6.223 | 0.271 |
| 3,000 | 116.587 | 1.446 | 0.0745 | 0.0086 | 16.104 | 0.958 |
| 5,000 | 184.077 | 3.356 | 0.0742 | 0.0111 | 27.513 | 1.580 |
| 10,000 | 352.960 | 4.925 | 0.0762 | 0.0115 | 53.386 | 3.807 |

## Scenario 2 — Async identifier (BehaviorSubject)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 32.431 | 1.922 | 0.0502 | 0.0167 | 7.312 | 0.950 |
| 3,000 | 128.839 | 3.505 | 0.0587 | 0.0123 | 20.958 | 2.665 |
| 5,000 | 223.556 | 5.964 | 0.0583 | 0.0112 | 33.295 | 5.391 |
| 10,000 | 458.857 | 15.109 | 0.0633 | 0.0120 | 63.914 | 11.586 |

## Scenario 3 — Same-model expressions (1000 generated, cycled)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single-x update (ms) | ANG single-x update (ms) | RSX bulk-x (10×) (ms) | ANG bulk-x (10×) (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 1868.666 | 0.692 | 207.038 | 1.097 | 1834.921 | 10.838 |
| 3,000 | 10647.858 | 3.500 | 528.386 | 3.552 | 5146.364 | 31.787 |

