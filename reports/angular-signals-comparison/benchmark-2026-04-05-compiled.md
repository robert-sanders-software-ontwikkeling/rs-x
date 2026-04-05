# Angular Signals vs rs-x comparison benchmark

Generated: 2026-04-05T18:43:56.703Z
Machine: Apple M4, 16.0 GB RAM, darwin/arm64
Node: v25.4.0

## Scenario 1 — Sync identifier

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 30.767 | 0.720 | 0.0994 | 0.0136 | 5.354 | 0.307 |
| 3,000 | 94.201 | 1.518 | 0.0703 | 0.0093 | 15.314 | 1.133 |
| 5,000 | 156.442 | 3.717 | 0.0705 | 0.0105 | 26.070 | 1.675 |
| 10,000 | 369.364 | 5.219 | 0.0935 | 0.0119 | 50.985 | 3.198 |

## Scenario 2 — Async identifier (BehaviorSubject)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single update (ms) | ANG single update (ms) | RSX bulk update (ms) | ANG bulk update (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 32.315 | 1.783 | 0.0616 | 0.0164 | 7.353 | 0.850 |
| 3,000 | 121.303 | 4.268 | 0.0617 | 0.0123 | 19.788 | 2.427 |
| 5,000 | 205.937 | 8.955 | 0.0628 | 0.0114 | 29.738 | 5.613 |
| 10,000 | 423.806 | 14.993 | 0.0602 | 0.0120 | 57.332 | 13.100 |

## Scenario 3 — Same-model expressions (1000 generated, cycled)

| Bindings | RSX bind (ms) | ANG bind (ms) | RSX single-x update (ms) | ANG single-x update (ms) | RSX bulk-x (10×) (ms) | ANG bulk-x (10×) (ms) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | 11.762 | 0.673 | 8.773 | 1.149 | 36.938 | 10.629 |

## Memory usage (mode-specific)

| Scenario | Metric | System | Median heap after run (MB) | Peak RSS after run (MB) |
| --- | --- | --- | ---: | ---: |
| Sync identifier (1,000) | Bind | RSX | 71.1 | 218.3 |
| Sync identifier (1,000) | Bind | Angular | 31.9 | 219.9 |
| Sync identifier (1,000) | Single update | RSX | 49.3 | 218.6 |
| Sync identifier (1,000) | Single update | Angular | 31.4 | 219.9 |
| Sync identifier (1,000) | Bulk update | RSX | 53.5 | 219.9 |
| Sync identifier (1,000) | Bulk update | Angular | 31.6 | 220.3 |
| Sync identifier (3,000) | Bind | RSX | 173.5 | 441.0 |
| Sync identifier (3,000) | Bind | Angular | 58.2 | 441.4 |
| Sync identifier (3,000) | Single update | RSX | 111.5 | 440.8 |
| Sync identifier (3,000) | Single update | Angular | 56.6 | 441.4 |
| Sync identifier (3,000) | Bulk update | RSX | 122.3 | 441.4 |
| Sync identifier (3,000) | Bulk update | Angular | 57.1 | 441.8 |
| Sync identifier (5,000) | Bind | RSX | 287.5 | 469.8 |
| Sync identifier (5,000) | Bind | Angular | 84.4 | 465.8 |
| Sync identifier (5,000) | Single update | RSX | 174.2 | 471.2 |
| Sync identifier (5,000) | Single update | Angular | 81.8 | 465.8 |
| Sync identifier (5,000) | Bulk update | RSX | 192.2 | 471.6 |
| Sync identifier (5,000) | Bulk update | Angular | 82.5 | 465.9 |
| Sync identifier (10,000) | Bind | RSX | 525.8 | 751.1 |
| Sync identifier (10,000) | Bind | Angular | 148.8 | 732.0 |
| Sync identifier (10,000) | Single update | RSX | 328.4 | 742.4 |
| Sync identifier (10,000) | Single update | Angular | 143.6 | 732.0 |
| Sync identifier (10,000) | Bulk update | RSX | 364.2 | 743.5 |
| Sync identifier (10,000) | Bulk update | Angular | 145.0 | 732.1 |
| Async identifier (1,000) | Bind | RSX | 200.7 | 733.6 |
| Async identifier (1,000) | Bind | Angular | 165.1 | 733.7 |
| Async identifier (1,000) | Single update | RSX | 185.1 | 733.6 |
| Async identifier (1,000) | Single update | Angular | 163.7 | 733.6 |
| Async identifier (1,000) | Bulk update | RSX | 188.1 | 733.6 |
| Async identifier (1,000) | Bulk update | Angular | 164.2 | 733.6 |
| Async identifier (3,000) | Bind | RSX | 329.0 | 736.2 |
| Async identifier (3,000) | Bind | Angular | 246.6 | 723.2 |
| Async identifier (3,000) | Single update | RSX | 307.9 | 735.5 |
| Async identifier (3,000) | Single update | Angular | 242.8 | 720.5 |
| Async identifier (3,000) | Bulk update | RSX | 315.5 | 736.2 |
| Async identifier (3,000) | Bulk update | Angular | 244.0 | 720.7 |
| Async identifier (5,000) | Bind | RSX | 516.7 | 729.8 |
| Async identifier (5,000) | Bind | Angular | 343.6 | 725.2 |
| Async identifier (5,000) | Single update | RSX | 446.7 | 730.6 |
| Async identifier (5,000) | Single update | Angular | 337.3 | 720.3 |
| Async identifier (5,000) | Bulk update | RSX | 459.3 | 731.4 |
| Async identifier (5,000) | Bulk update | Angular | 339.3 | 720.7 |
| Async identifier (10,000) | Bind | RSX | 872.6 | 1074.3 |
| Async identifier (10,000) | Bind | Angular | 523.7 | 1052.8 |
| Async identifier (10,000) | Single update | RSX | 731.9 | 1063.7 |
| Async identifier (10,000) | Single update | Angular | 513.2 | 1051.1 |
| Async identifier (10,000) | Bulk update | RSX | 757.1 | 1065.6 |
| Async identifier (10,000) | Bulk update | Angular | 517.2 | 1045.3 |
| Same-model generated (1,000) | Bind | RSX | 526.6 | 1046.3 |
| Same-model generated (1,000) | Bind | Angular | 518.4 | 1046.0 |
| Same-model generated (1,000) | Dispose | RSX | 526.6 | 1046.3 |
| Same-model generated (1,000) | Single update | RSX | 523.7 | 1045.3 |
| Same-model generated (1,000) | Single update | Angular | 521.2 | 1048.8 |
| Same-model generated (1,000) | Bulk update | RSX | 544.7 | 1045.9 |
| Same-model generated (1,000) | Bulk update | Angular | 529.4 | 1049.2 |

