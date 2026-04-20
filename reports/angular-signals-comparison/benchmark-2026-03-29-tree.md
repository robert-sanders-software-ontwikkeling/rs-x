# Angular Signals vs rs-x comparison benchmark

Generated: 2026-03-29T16:35:03.086Z
Machine: Apple M4, 16.0 GB RAM, darwin/arm64
Node: v25.4.0

## Scenario 1 — Sync identifier

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 32.897 | 0.783 | 0.0957 | 0.0125 | 6.939 | 0.364 |
| 3,000 | 123.693 | 1.596 | 0.0839 | 0.0096 | 18.120 | 1.259 |
| 5,000 | 231.285 | 3.540 | 0.0844 | 0.0118 | 29.935 | 2.647 |
| 10,000 | 438.742 | 5.800 | 0.0816 | 0.0128 | 52.068 | 4.731 |

## Scenario 2 — Async identifier (BehaviorSubject)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 39.207 | 2.873 | 0.0741 | 0.0187 | 8.263 | 1.657 |
| 3,000 | 163.356 | 4.954 | 0.0710 | 0.0143 | 22.574 | 3.935 |
| 5,000 | 282.426 | 6.848 | 0.0674 | 0.0125 | 36.594 | 6.959 |
| 10,000 | 544.327 | 23.108 | 0.0663 | 0.0133 | 66.374 | 13.354 |

## Scenario 3 — Same-model expressions (1000 generated, cycled)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single-x update (ms) | ANG single-x update (ms) | RSX bulk-x (10×) (ms) | ANG bulk-x (10×) (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 450.981 | 0.672 | 63.860 | 1.265 | 468.628 | 12.254 |

## Memory usage (mode-specific)

| Scenario | Metric | System | Median heap after run (MB) | Peak RSS after run (MB) |
| --- | --- | --- | ---: | ---: |
| Sync identifier (1,000) | Bind | RSX | 78.7 | 214.7 |
| Sync identifier (1,000) | Bind | Angular | 29.5 | 216.6 |
| Sync identifier (1,000) | Single update | RSX | 48.3 | 215.3 |
| Sync identifier (1,000) | Single update | Angular | 28.9 | 216.6 |
| Sync identifier (1,000) | Bulk update | RSX | 52.6 | 216.6 |
| Sync identifier (1,000) | Bulk update | Angular | 29.1 | 216.7 |
| Sync identifier (3,000) | Bind | RSX | 190.2 | 437.0 |
| Sync identifier (3,000) | Bind | Angular | 50.8 | 438.2 |
| Sync identifier (3,000) | Single update | RSX | 108.4 | 437.7 |
| Sync identifier (3,000) | Single update | Angular | 49.3 | 438.2 |
| Sync identifier (3,000) | Bulk update | RSX | 119.2 | 438.3 |
| Sync identifier (3,000) | Bulk update | Angular | 49.7 | 438.2 |
| Sync identifier (5,000) | Bind | RSX | 312.0 | 485.6 |
| Sync identifier (5,000) | Bind | Angular | 72.0 | 481.6 |
| Sync identifier (5,000) | Single update | RSX | 168.9 | 487.2 |
| Sync identifier (5,000) | Single update | Angular | 69.4 | 481.5 |
| Sync identifier (5,000) | Bulk update | RSX | 187.0 | 487.6 |
| Sync identifier (5,000) | Bulk update | Angular | 70.1 | 481.6 |
| Sync identifier (10,000) | Bind | RSX | 567.0 | 786.3 |
| Sync identifier (10,000) | Bind | Angular | 124.6 | 767.4 |
| Sync identifier (10,000) | Single update | RSX | 318.5 | 776.6 |
| Sync identifier (10,000) | Single update | Angular | 119.5 | 767.4 |
| Sync identifier (10,000) | Bulk update | RSX | 354.3 | 778.8 |
| Sync identifier (10,000) | Bulk update | Angular | 120.8 | 767.6 |
| Async identifier (1,000) | Bind | RSX | 185.7 | 769.3 |
| Async identifier (1,000) | Bind | Angular | 143.1 | 769.5 |
| Async identifier (1,000) | Single update | RSX | 164.6 | 769.3 |
| Async identifier (1,000) | Single update | Angular | 141.8 | 769.5 |
| Async identifier (1,000) | Bulk update | RSX | 167.6 | 769.4 |
| Async identifier (1,000) | Bulk update | Angular | 142.2 | 769.7 |
| Async identifier (3,000) | Bind | RSX | 337.1 | 772.2 |
| Async identifier (3,000) | Bind | Angular | 232.8 | 773.6 |
| Async identifier (3,000) | Single update | RSX | 298.3 | 773.5 |
| Async identifier (3,000) | Single update | Angular | 228.9 | 773.7 |
| Async identifier (3,000) | Bulk update | RSX | 305.9 | 773.6 |
| Async identifier (3,000) | Bulk update | Angular | 230.1 | 773.7 |
| Async identifier (5,000) | Bind | RSX | 520.5 | 783.3 |
| Async identifier (5,000) | Bind | Angular | 340.6 | 777.7 |
| Async identifier (5,000) | Single update | RSX | 450.8 | 783.5 |
| Async identifier (5,000) | Single update | Angular | 334.3 | 778.1 |
| Async identifier (5,000) | Bulk update | RSX | 463.4 | 784.5 |
| Async identifier (5,000) | Bulk update | Angular | 336.3 | 777.9 |
| Async identifier (10,000) | Bind | RSX | 948.7 | 1169.4 |
| Async identifier (10,000) | Bind | Angular | 536.3 | 1149.1 |
| Async identifier (10,000) | Single update | RSX | 758.7 | 1159.0 |
| Async identifier (10,000) | Single update | Angular | 525.7 | 1149.1 |
| Async identifier (10,000) | Bulk update | RSX | 783.9 | 1161.5 |
| Async identifier (10,000) | Bulk update | Angular | 529.7 | 1149.1 |
| Same-model generated (1,000) | Bind | RSX | 1536.2 | 1773.5 |
| Same-model generated (1,000) | Bind | Angular | 1530.7 | 1798.4 |
| Same-model generated (1,000) | Dispose | RSX | 1536.2 | 1773.5 |
| Same-model generated (1,000) | Single update | RSX | 1533.9 | 1779.1 |
| Same-model generated (1,000) | Single update | Angular | 1533.5 | 1801.3 |
| Same-model generated (1,000) | Bulk update | RSX | 1565.5 | 1798.1 |
| Same-model generated (1,000) | Bulk update | Angular | 1541.7 | 1802.0 |

