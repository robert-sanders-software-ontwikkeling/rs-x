# RS-X SPA benchmark median-of-runs report

Date: 2026-03-14
Runs: 5

## Parse

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 8.820 | 8.643 | 9.168 |
| 5,000 | 27.645 | 26.503 | 29.912 |
| 10,000 | 42.084 | 38.718 | 42.738 |

## Bind

### Unique expression per binding

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 32.941 | 32.568 | 34.524 |
| 3,000 | 113.485 | 110.029 | 115.183 |
| 5,000 | 215.333 | 209.520 | 228.570 |

### Cached expression string

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 26.500 | 25.314 | 27.273 |
| 3,000 | 117.806 | 115.907 | 120.711 |
| 5,000 | 212.290 | 208.852 | 232.851 |

## Update

### Single mutation with active bindings

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 0.102 | 0.099 | 0.116 |
| 3,000 | 0.076 | 0.074 | 0.081 |
| 5,000 | 0.070 | 0.067 | 0.075 |

### Bulk mutate all bindings

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 8.557 | 8.379 | 8.943 |
| 3,000 | 30.207 | 29.170 | 33.341 |
| 5,000 | 45.312 | 43.454 | 46.106 |

