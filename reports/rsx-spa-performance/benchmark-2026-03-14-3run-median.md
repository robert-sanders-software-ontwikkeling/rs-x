# RS-X SPA benchmark median-of-runs report

Date: 2026-03-14
Runs: 3

## Parse

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 8.838 | 8.769 | 8.960 |
| 5,000 | 29.771 | 28.441 | 30.618 |
| 10,000 | 38.943 | 38.350 | 42.969 |

## Bind

### Unique expression per binding

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 32.855 | 31.809 | 37.919 |
| 3,000 | 123.506 | 109.603 | 128.220 |
| 5,000 | 230.632 | 218.470 | 244.802 |

### Cached expression string

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 26.625 | 25.725 | 26.794 |
| 3,000 | 121.150 | 117.964 | 125.966 |
| 5,000 | 237.029 | 229.451 | 247.538 |

## Update

### Single mutation with active bindings

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 0.104 | 0.100 | 0.105 |
| 3,000 | 0.078 | 0.075 | 0.078 |
| 5,000 | 0.069 | 0.067 | 0.070 |

### Bulk mutate all bindings

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 8.835 | 8.833 | 9.396 |
| 3,000 | 31.997 | 30.678 | 32.436 |
| 5,000 | 45.213 | 44.325 | 45.331 |

