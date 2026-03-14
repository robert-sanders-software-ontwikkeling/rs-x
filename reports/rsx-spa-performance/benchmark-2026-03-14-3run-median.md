# RS-X SPA benchmark median-of-runs report

Date: 2026-03-14
Runs: 3

## Parse

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 8.808 | 8.630 | 9.041 |
| 5,000 | 27.668 | 25.565 | 30.782 |
| 10,000 | 38.589 | 38.150 | 40.655 |

## Bind

### Unique expression per binding

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 31.907 | 31.786 | 32.054 |
| 3,000 | 109.663 | 109.335 | 109.944 |
| 5,000 | 217.109 | 207.601 | 220.712 |

### Cached expression string

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 24.769 | 24.702 | 25.577 |
| 3,000 | 119.262 | 115.430 | 124.385 |
| 5,000 | 212.993 | 210.253 | 224.456 |

## Update

### Single mutation with active bindings

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 0.088 | 0.088 | 0.092 |
| 3,000 | 0.065 | 0.063 | 0.070 |
| 5,000 | 0.061 | 0.060 | 0.064 |

### Bulk mutate all bindings

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 8.098 | 8.038 | 8.346 |
| 3,000 | 29.198 | 29.022 | 30.187 |
| 5,000 | 42.457 | 42.373 | 45.100 |

