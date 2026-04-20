# Angular Signals vs rs-x comparison benchmark

Generated: 2026-03-31T11:48:10.647Z
Machine: Apple M4, 16.0 GB RAM, darwin/arm64
Node: v25.4.0

## Scenario 1 — Sync identifier

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 27.327 | 0.462 | 0.0719 | 0.0074 | 4.605 | 0.169 |
| 3,000 | 92.217 | 1.411 | 0.0559 | 0.0067 | 13.523 | 0.770 |
| 5,000 | 153.982 | 2.800 | 0.0669 | 0.0092 | 22.606 | 1.235 |
| 10,000 | 318.208 | 4.640 | 0.0634 | 0.0108 | 41.533 | 2.431 |

## Scenario 2 — Async identifier (BehaviorSubject)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 30.714 | 1.832 | 0.0472 | 0.0113 | 5.858 | 1.179 |
| 3,000 | 114.630 | 3.883 | 0.0501 | 0.0091 | 16.757 | 2.558 |
| 5,000 | 192.159 | 4.831 | 0.0433 | 0.0095 | 27.541 | 4.548 |
| 10,000 | 400.468 | 10.858 | 0.0549 | 0.0109 | 50.624 | 10.290 |

## Scenario 3 — Same-model expressions (1000 generated, cycled)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single-x update (ms) | ANG single-x update (ms) | RSX bulk-x (10×) (ms) | ANG bulk-x (10×) (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 358.387 | 0.648 | 49.734 | 1.134 | 393.438 | 8.633 |

## Memory usage (mode-specific)

| Scenario | Metric | System | Median heap after run (MB) | Peak RSS after run (MB) |
| --- | --- | --- | ---: | ---: |
| Sync identifier (1,000) | Bind | RSX | 76.0 | 218.4 |
| Sync identifier (1,000) | Bind | Angular | 28.3 | 220.2 |
| Sync identifier (1,000) | Single update | RSX | 47.1 | 218.5 |
| Sync identifier (1,000) | Single update | Angular | 27.7 | 220.2 |
| Sync identifier (1,000) | Bulk update | RSX | 51.2 | 220.2 |
| Sync identifier (1,000) | Bulk update | Angular | 27.9 | 220.6 |
| Sync identifier (3,000) | Bind | RSX | 180.3 | 407.5 |
| Sync identifier (3,000) | Bind | Angular | 47.0 | 408.5 |
| Sync identifier (3,000) | Single update | RSX | 104.6 | 407.8 |
| Sync identifier (3,000) | Single update | Angular | 45.4 | 408.5 |
| Sync identifier (3,000) | Bulk update | RSX | 115.1 | 408.4 |
| Sync identifier (3,000) | Bulk update | Angular | 45.9 | 408.8 |
| Sync identifier (5,000) | Bind | RSX | 293.4 | 481.9 |
| Sync identifier (5,000) | Bind | Angular | 65.6 | 477.5 |
| Sync identifier (5,000) | Single update | RSX | 162.5 | 482.3 |
| Sync identifier (5,000) | Single update | Angular | 63.0 | 477.5 |
| Sync identifier (5,000) | Bulk update | RSX | 180.0 | 483.4 |
| Sync identifier (5,000) | Bulk update | Angular | 63.7 | 477.7 |
| Sync identifier (10,000) | Bind | RSX | 551.7 | 744.1 |
| Sync identifier (10,000) | Bind | Angular | 111.7 | 727.3 |
| Sync identifier (10,000) | Single update | RSX | 305.6 | 737.4 |
| Sync identifier (10,000) | Single update | Angular | 106.6 | 727.3 |
| Sync identifier (10,000) | Bulk update | RSX | 340.3 | 738.8 |
| Sync identifier (10,000) | Bulk update | Angular | 107.9 | 727.9 |
| Async identifier (1,000) | Bind | RSX | 170.0 | 729.7 |
| Async identifier (1,000) | Bind | Angular | 129.0 | 729.8 |
| Async identifier (1,000) | Single update | RSX | 150.4 | 729.7 |
| Async identifier (1,000) | Single update | Angular | 127.6 | 729.8 |
| Async identifier (1,000) | Bulk update | RSX | 153.3 | 729.8 |
| Async identifier (1,000) | Bulk update | Angular | 128.0 | 730.1 |
| Async identifier (3,000) | Bind | RSX | 306.9 | 732.8 |
| Async identifier (3,000) | Bind | Angular | 216.0 | 734.3 |
| Async identifier (3,000) | Single update | RSX | 281.6 | 733.3 |
| Async identifier (3,000) | Single update | Angular | 212.1 | 734.3 |
| Async identifier (3,000) | Bulk update | RSX | 288.8 | 733.9 |
| Async identifier (3,000) | Bulk update | Angular | 213.3 | 734.9 |
| Async identifier (5,000) | Bind | RSX | 512.3 | 744.2 |
| Async identifier (5,000) | Bind | Angular | 321.2 | 738.1 |
| Async identifier (5,000) | Single update | RSX | 431.4 | 744.8 |
| Async identifier (5,000) | Single update | Angular | 314.9 | 738.2 |
| Async identifier (5,000) | Bulk update | RSX | 443.5 | 745.6 |
| Async identifier (5,000) | Bulk update | Angular | 316.9 | 738.3 |
| Async identifier (10,000) | Bind | RSX | 894.8 | 1145.1 |
| Async identifier (10,000) | Bind | Angular | 510.1 | 1124.1 |
| Async identifier (10,000) | Single update | RSX | 732.9 | 1135.0 |
| Async identifier (10,000) | Single update | Angular | 499.9 | 1124.1 |
| Async identifier (10,000) | Bulk update | RSX | 756.9 | 1136.4 |
| Async identifier (10,000) | Bulk update | Angular | 503.9 | 1124.3 |
| Same-model generated (1,000) | Bind | RSX | 1499.7 | 1738.0 |
| Same-model generated (1,000) | Bind | Angular | 1487.6 | 1759.8 |
| Same-model generated (1,000) | Dispose | RSX | 1499.7 | 1738.0 |
| Same-model generated (1,000) | Single update | RSX | 1495.7 | 1741.3 |
| Same-model generated (1,000) | Single update | Angular | 1490.5 | 1764.1 |
| Same-model generated (1,000) | Bulk update | RSX | 1527.3 | 1759.5 |
| Same-model generated (1,000) | Bulk update | Angular | 1498.6 | 1764.4 |

