# Angular Signals vs rs-x comparison benchmark

Generated: 2026-03-31T11:47:10.413Z
Machine: Apple M4, 16.0 GB RAM, darwin/arm64
Node: v25.4.0

## Scenario 1 — Sync identifier

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 30.129 | 0.643 | 0.0947 | 0.0078 | 5.149 | 0.149 |
| 3,000 | 93.439 | 1.403 | 0.0629 | 0.0068 | 14.596 | 0.661 |
| 5,000 | 156.838 | 2.821 | 0.0673 | 0.0081 | 25.580 | 1.422 |
| 10,000 | 356.804 | 5.392 | 0.0729 | 0.0110 | 48.766 | 3.156 |

## Scenario 2 — Async identifier (BehaviorSubject)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 32.377 | 1.724 | 0.0484 | 0.0154 | 6.488 | 0.977 |
| 3,000 | 121.327 | 3.635 | 0.0518 | 0.0102 | 17.817 | 2.946 |
| 5,000 | 210.473 | 5.408 | 0.0584 | 0.0089 | 29.548 | 4.819 |
| 10,000 | 426.003 | 10.953 | 0.0624 | 0.0116 | 55.592 | 5.676 |

## Scenario 3 — Same-model expressions (1000 generated, cycled)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single-x update (ms) | ANG single-x update (ms) | RSX bulk-x (10×) (ms) | ANG bulk-x (10×) (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 11.884 | 0.614 | 5.560 | 1.106 | 34.887 | 8.331 |

## Memory usage (mode-specific)

| Scenario | Metric | System | Median heap after run (MB) | Peak RSS after run (MB) |
| --- | --- | --- | ---: | ---: |
| Sync identifier (1,000) | Bind | RSX | 74.0 | 222.5 |
| Sync identifier (1,000) | Bind | Angular | 27.8 | 224.4 |
| Sync identifier (1,000) | Single update | RSX | 51.0 | 222.7 |
| Sync identifier (1,000) | Single update | Angular | 27.3 | 224.4 |
| Sync identifier (1,000) | Bulk update | RSX | 55.2 | 224.3 |
| Sync identifier (1,000) | Bulk update | Angular | 27.5 | 224.4 |
| Sync identifier (3,000) | Bind | RSX | 177.3 | 431.0 |
| Sync identifier (3,000) | Bind | Angular | 45.9 | 431.2 |
| Sync identifier (3,000) | Single update | RSX | 116.5 | 431.0 |
| Sync identifier (3,000) | Single update | Angular | 44.3 | 431.2 |
| Sync identifier (3,000) | Bulk update | RSX | 127.4 | 431.2 |
| Sync identifier (3,000) | Bulk update | Angular | 44.8 | 431.2 |
| Sync identifier (5,000) | Bind | RSX | 288.1 | 450.2 |
| Sync identifier (5,000) | Bind | Angular | 63.7 | 446.3 |
| Sync identifier (5,000) | Single update | RSX | 182.4 | 451.5 |
| Sync identifier (5,000) | Single update | Angular | 61.1 | 446.3 |
| Sync identifier (5,000) | Bulk update | RSX | 200.4 | 452.3 |
| Sync identifier (5,000) | Bulk update | Angular | 61.8 | 446.9 |
| Sync identifier (10,000) | Bind | RSX | 549.3 | 736.5 |
| Sync identifier (10,000) | Bind | Angular | 107.6 | 716.9 |
| Sync identifier (10,000) | Single update | RSX | 344.8 | 727.9 |
| Sync identifier (10,000) | Single update | Angular | 102.4 | 716.9 |
| Sync identifier (10,000) | Bulk update | RSX | 380.7 | 729.8 |
| Sync identifier (10,000) | Bulk update | Angular | 103.7 | 717.3 |
| Async identifier (1,000) | Bind | RSX | 164.7 | 719.6 |
| Async identifier (1,000) | Bind | Angular | 125.4 | 719.8 |
| Async identifier (1,000) | Single update | RSX | 149.3 | 719.6 |
| Async identifier (1,000) | Single update | Angular | 124.0 | 719.8 |
| Async identifier (1,000) | Bulk update | RSX | 152.3 | 719.8 |
| Async identifier (1,000) | Bulk update | Angular | 124.5 | 720.0 |
| Async identifier (3,000) | Bind | RSX | 313.4 | 722.8 |
| Async identifier (3,000) | Bind | Angular | 214.1 | 723.7 |
| Async identifier (3,000) | Single update | RSX | 287.0 | 723.0 |
| Async identifier (3,000) | Single update | Angular | 210.2 | 723.8 |
| Async identifier (3,000) | Bulk update | RSX | 294.6 | 723.4 |
| Async identifier (3,000) | Bulk update | Angular | 211.4 | 724.1 |
| Async identifier (5,000) | Bind | RSX | 496.9 | 734.7 |
| Async identifier (5,000) | Bind | Angular | 320.4 | 728.6 |
| Async identifier (5,000) | Single update | RSX | 442.9 | 734.4 |
| Async identifier (5,000) | Single update | Angular | 314.0 | 728.9 |
| Async identifier (5,000) | Bulk update | RSX | 455.5 | 735.0 |
| Async identifier (5,000) | Bulk update | Angular | 316.1 | 728.9 |
| Async identifier (10,000) | Bind | RSX | 881.3 | 1115.2 |
| Async identifier (10,000) | Bind | Angular | 512.0 | 1094.0 |
| Async identifier (10,000) | Single update | RSX | 759.5 | 1104.4 |
| Async identifier (10,000) | Single update | Angular | 501.2 | 1094.0 |
| Async identifier (10,000) | Bulk update | RSX | 784.8 | 1105.4 |
| Async identifier (10,000) | Bulk update | Angular | 505.2 | 1095.0 |
| Same-model generated (1,000) | Bind | RSX | 515.3 | 1104.1 |
| Same-model generated (1,000) | Bind | Angular | 507.0 | 1104.6 |
| Same-model generated (1,000) | Dispose | RSX | 515.3 | 1104.1 |
| Same-model generated (1,000) | Single update | RSX | 512.3 | 1104.6 |
| Same-model generated (1,000) | Single update | Angular | 509.9 | 1108.1 |
| Same-model generated (1,000) | Bulk update | RSX | 533.1 | 1104.6 |
| Same-model generated (1,000) | Bulk update | Angular | 518.1 | 1108.7 |

