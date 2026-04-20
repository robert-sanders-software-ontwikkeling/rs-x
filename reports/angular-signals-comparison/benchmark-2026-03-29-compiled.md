# Angular Signals vs rs-x comparison benchmark

Generated: 2026-03-29T16:41:12.863Z
Machine: Apple M4, 16.0 GB RAM, darwin/arm64
Node: v25.4.0

## Scenario 1 — Sync identifier

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 41.186 | 1.067 | 0.1307 | 0.0151 | 9.481 | 0.432 |
| 3,000 | 192.671 | 1.992 | 0.1054 | 0.0104 | 27.162 | 1.978 |
| 5,000 | 309.847 | 3.884 | 0.1007 | 0.0112 | 45.502 | 2.737 |
| 10,000 | 729.196 | 6.254 | 0.0985 | 0.0133 | 80.795 | 5.805 |

## Scenario 2 — Async identifier (BehaviorSubject)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 45.380 | 2.876 | 0.0764 | 0.0218 | 9.836 | 1.254 |
| 3,000 | 174.556 | 6.036 | 0.0748 | 0.0143 | 25.043 | 3.540 |
| 5,000 | 280.834 | 8.181 | 0.0797 | 0.0130 | 42.332 | 6.906 |
| 10,000 | 616.198 | 20.227 | 0.0892 | 0.0129 | 80.353 | 10.230 |

## Scenario 3 — Same-model expressions (1000 generated, cycled)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single-x update (ms) | ANG single-x update (ms) | RSX bulk-x (10×) (ms) | ANG bulk-x (10×) (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 20.370 | 0.726 | 7.842 | 1.479 | 37.354 | 13.178 |

## Memory usage (mode-specific)

| Scenario | Metric | System | Median heap after run (MB) | Peak RSS after run (MB) |
| --- | --- | --- | ---: | ---: |
| Sync identifier (1,000) | Bind | RSX | 82.9 | 222.6 |
| Sync identifier (1,000) | Bind | Angular | 28.6 | 223.9 |
| Sync identifier (1,000) | Single update | RSX | 54.7 | 223.1 |
| Sync identifier (1,000) | Single update | Angular | 28.0 | 223.9 |
| Sync identifier (1,000) | Bulk update | RSX | 59.1 | 223.9 |
| Sync identifier (1,000) | Bulk update | Angular | 28.2 | 223.9 |
| Sync identifier (3,000) | Bind | RSX | 201.3 | 427.8 |
| Sync identifier (3,000) | Bind | Angular | 47.8 | 428.8 |
| Sync identifier (3,000) | Single update | RSX | 127.1 | 428.4 |
| Sync identifier (3,000) | Single update | Angular | 46.2 | 428.8 |
| Sync identifier (3,000) | Bulk update | RSX | 138.6 | 428.7 |
| Sync identifier (3,000) | Bulk update | Angular | 46.7 | 428.8 |
| Sync identifier (5,000) | Bind | RSX | 313.7 | 498.5 |
| Sync identifier (5,000) | Bind | Angular | 66.9 | 494.7 |
| Sync identifier (5,000) | Single update | RSX | 200.1 | 499.6 |
| Sync identifier (5,000) | Single update | Angular | 64.3 | 494.7 |
| Sync identifier (5,000) | Bulk update | RSX | 219.2 | 500.3 |
| Sync identifier (5,000) | Bulk update | Angular | 65.0 | 494.7 |
| Sync identifier (10,000) | Bind | RSX | 610.7 | 824.9 |
| Sync identifier (10,000) | Bind | Angular | 113.7 | 805.6 |
| Sync identifier (10,000) | Single update | RSX | 380.0 | 814.8 |
| Sync identifier (10,000) | Single update | Angular | 108.5 | 805.6 |
| Sync identifier (10,000) | Bulk update | RSX | 417.6 | 816.6 |
| Sync identifier (10,000) | Bulk update | Angular | 109.8 | 805.6 |
| Async identifier (1,000) | Bind | RSX | 177.7 | 806.8 |
| Async identifier (1,000) | Bind | Angular | 130.1 | 807.5 |
| Async identifier (1,000) | Single update | RSX | 156.9 | 806.8 |
| Async identifier (1,000) | Single update | Angular | 128.7 | 807.5 |
| Async identifier (1,000) | Bulk update | RSX | 160.1 | 806.8 |
| Async identifier (1,000) | Bulk update | Angular | 129.1 | 807.5 |
| Async identifier (3,000) | Bind | RSX | 314.7 | 810.2 |
| Async identifier (3,000) | Bind | Angular | 216.0 | 811.0 |
| Async identifier (3,000) | Single update | RSX | 297.6 | 811.0 |
| Async identifier (3,000) | Single update | Angular | 212.2 | 811.1 |
| Async identifier (3,000) | Bulk update | RSX | 305.8 | 811.3 |
| Async identifier (3,000) | Bulk update | Angular | 213.4 | 811.2 |
| Async identifier (5,000) | Bind | RSX | 535.5 | 821.3 |
| Async identifier (5,000) | Bind | Angular | 319.5 | 816.0 |
| Async identifier (5,000) | Single update | RSX | 456.6 | 821.2 |
| Async identifier (5,000) | Single update | Angular | 313.1 | 816.2 |
| Async identifier (5,000) | Bulk update | RSX | 470.2 | 822.1 |
| Async identifier (5,000) | Bulk update | Angular | 315.2 | 816.3 |
| Async identifier (10,000) | Bind | RSX | 922.9 | 1182.9 |
| Async identifier (10,000) | Bind | Angular | 504.6 | 1161.9 |
| Async identifier (10,000) | Single update | RSX | 780.9 | 1171.3 |
| Async identifier (10,000) | Single update | Angular | 493.4 | 1161.8 |
| Async identifier (10,000) | Bulk update | RSX | 807.6 | 1174.0 |
| Async identifier (10,000) | Bulk update | Angular | 497.4 | 1161.9 |
| Same-model generated (1,000) | Bind | RSX | 504.1 | 1165.2 |
| Same-model generated (1,000) | Bind | Angular | 495.5 | 1168.5 |
| Same-model generated (1,000) | Dispose | RSX | 504.1 | 1165.2 |
| Same-model generated (1,000) | Single update | RSX | 502.9 | 1168.2 |
| Same-model generated (1,000) | Single update | Angular | 498.3 | 1173.6 |
| Same-model generated (1,000) | Bulk update | RSX | 516.7 | 1168.2 |
| Same-model generated (1,000) | Bulk update | Angular | 506.5 | 1174.7 |

