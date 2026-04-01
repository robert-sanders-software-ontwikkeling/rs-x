# Angular Signals vs rs-x comparison benchmark

Generated: 2026-03-30T18:37:47.564Z
Machine: Apple M4, 16.0 GB RAM, darwin/arm64
Node: v25.4.0

## Scenario 1 — Sync identifier

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 27.196 | 0.820 | 0.0766 | 0.0098 | 5.370 | 0.166 |
| 3,000 | 96.644 | 1.858 | 0.0574 | 0.0058 | 15.151 | 0.509 |
| 5,000 | 166.211 | 2.559 | 0.0648 | 0.0073 | 26.084 | 1.132 |
| 10,000 | 400.612 | 4.416 | 0.0820 | 0.0104 | 49.202 | 2.661 |

## Scenario 2 — Async identifier (BehaviorSubject)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 33.120 | 1.632 | 0.0483 | 0.0133 | 6.448 | 0.843 |
| 3,000 | 121.977 | 3.723 | 0.0550 | 0.0093 | 18.459 | 2.767 |
| 5,000 | 216.535 | 5.058 | 0.0587 | 0.0091 | 29.503 | 4.720 |
| 10,000 | 427.577 | 11.233 | 0.0563 | 0.0097 | 56.045 | 10.780 |

## Scenario 3 — Same-model expressions (1000 generated, cycled)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single-x update (ms) | ANG single-x update (ms) | RSX bulk-x (10×) (ms) | ANG bulk-x (10×) (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 17.583 | 0.685 | 6.930 | 1.207 | 33.796 | 8.496 |

## Memory usage (mode-specific)

| Scenario | Metric | System | Median heap after run (MB) | Peak RSS after run (MB) |
| --- | --- | --- | ---: | ---: |
| Sync identifier (1,000) | Bind | RSX | 79.2 | 242.2 |
| Sync identifier (1,000) | Bind | Angular | 26.8 | 243.8 |
| Sync identifier (1,000) | Single update | RSX | 51.4 | 242.5 |
| Sync identifier (1,000) | Single update | Angular | 26.2 | 243.8 |
| Sync identifier (1,000) | Bulk update | RSX | 55.8 | 243.8 |
| Sync identifier (1,000) | Bulk update | Angular | 26.4 | 243.9 |
| Sync identifier (3,000) | Bind | RSX | 191.5 | 424.4 |
| Sync identifier (3,000) | Bind | Angular | 42.5 | 425.3 |
| Sync identifier (3,000) | Single update | RSX | 117.4 | 424.8 |
| Sync identifier (3,000) | Single update | Angular | 40.9 | 425.3 |
| Sync identifier (3,000) | Bulk update | RSX | 128.8 | 425.5 |
| Sync identifier (3,000) | Bulk update | Angular | 41.3 | 425.5 |
| Sync identifier (5,000) | Bind | RSX | 284.8 | 487.6 |
| Sync identifier (5,000) | Bind | Angular | 57.8 | 483.2 |
| Sync identifier (5,000) | Single update | RSX | 183.7 | 488.3 |
| Sync identifier (5,000) | Single update | Angular | 55.2 | 483.2 |
| Sync identifier (5,000) | Bulk update | RSX | 202.6 | 488.9 |
| Sync identifier (5,000) | Bulk update | Angular | 55.9 | 483.6 |
| Sync identifier (10,000) | Bind | RSX | 589.8 | 801.2 |
| Sync identifier (10,000) | Bind | Angular | 96.1 | 785.4 |
| Sync identifier (10,000) | Single update | RSX | 347.8 | 795.9 |
| Sync identifier (10,000) | Single update | Angular | 91.0 | 785.4 |
| Sync identifier (10,000) | Bulk update | RSX | 385.1 | 797.9 |
| Sync identifier (10,000) | Bulk update | Angular | 92.3 | 785.6 |
| Async identifier (1,000) | Bind | RSX | 158.6 | 786.5 |
| Async identifier (1,000) | Bind | Angular | 112.8 | 786.6 |
| Async identifier (1,000) | Single update | RSX | 138.2 | 786.5 |
| Async identifier (1,000) | Single update | Angular | 111.4 | 786.5 |
| Async identifier (1,000) | Bulk update | RSX | 141.4 | 786.5 |
| Async identifier (1,000) | Bulk update | Angular | 111.9 | 786.5 |
| Async identifier (3,000) | Bind | RSX | 316.3 | 789.4 |
| Async identifier (3,000) | Bind | Angular | 199.1 | 789.6 |
| Async identifier (3,000) | Single update | RSX | 276.4 | 789.1 |
| Async identifier (3,000) | Single update | Angular | 195.3 | 789.6 |
| Async identifier (3,000) | Bulk update | RSX | 284.6 | 789.7 |
| Async identifier (3,000) | Bulk update | Angular | 196.5 | 789.6 |
| Async identifier (5,000) | Bind | RSX | 509.8 | 799.6 |
| Async identifier (5,000) | Bind | Angular | 303.1 | 792.9 |
| Async identifier (5,000) | Single update | RSX | 432.9 | 799.9 |
| Async identifier (5,000) | Single update | Angular | 296.8 | 793.0 |
| Async identifier (5,000) | Bulk update | RSX | 446.5 | 800.3 |
| Async identifier (5,000) | Bulk update | Angular | 298.8 | 793.0 |
| Async identifier (10,000) | Bind | RSX | 919.8 | 1158.1 |
| Async identifier (10,000) | Bind | Angular | 491.3 | 1136.9 |
| Async identifier (10,000) | Single update | RSX | 751.0 | 1147.3 |
| Async identifier (10,000) | Single update | Angular | 478.9 | 1136.9 |
| Async identifier (10,000) | Bulk update | RSX | 777.6 | 1149.3 |
| Async identifier (10,000) | Bulk update | Angular | 482.9 | 1137.4 |
| Same-model generated (1,000) | Bind | RSX | 492.5 | 1142.9 |
| Same-model generated (1,000) | Bind | Angular | 480.4 | 1143.1 |
| Same-model generated (1,000) | Dispose | RSX | 492.5 | 1142.9 |
| Same-model generated (1,000) | Single update | RSX | 488.7 | 1143.0 |
| Same-model generated (1,000) | Single update | Angular | 483.3 | 1147.5 |
| Same-model generated (1,000) | Bulk update | RSX | 511.6 | 1143.0 |
| Same-model generated (1,000) | Bulk update | Angular | 491.4 | 1147.9 |

