# RS-X SPA benchmark median-of-runs report

Date: 2026-03-14
Runs: 3

## Parse

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 8.938 | 8.533 | 9.155 |
| 5,000 | 28.990 | 26.879 | 32.932 |
| 10,000 | 38.929 | 37.983 | 40.390 |

## Bind

### Unique expression per binding

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 32.444 | 30.924 | 34.808 |
| 3,000 | 113.784 | 109.068 | 123.485 |
| 5,000 | 219.151 | 211.445 | 227.449 |

### Cached expression string

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 25.733 | 24.908 | 26.038 |
| 3,000 | 124.436 | 115.192 | 124.614 |
| 5,000 | 227.091 | 221.165 | 241.444 |

## Update

### Single mutation with active bindings

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 0.100 | 0.098 | 0.101 |
| 3,000 | 0.078 | 0.075 | 0.082 |
| 5,000 | 0.077 | 0.068 | 0.082 |

### Bulk mutate all bindings

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 9.016 | 8.360 | 9.271 |
| 3,000 | 31.070 | 30.421 | 42.145 |
| 5,000 | 44.577 | 43.039 | 50.174 |

