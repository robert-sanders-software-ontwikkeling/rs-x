# RS-X SPA benchmark median-of-runs report

Date: 2026-03-14
Runs: 5

## Parse

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 8.825 | 8.486 | 13.366 |
| 5,000 | 29.016 | 26.970 | 29.737 |
| 10,000 | 39.174 | 38.539 | 42.494 |

## Bind

### Unique expression per binding

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 37.792 | 35.754 | 39.683 |
| 3,000 | 115.673 | 112.549 | 124.846 |
| 5,000 | 223.899 | 214.308 | 242.249 |

### Cached expression string

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 29.064 | 27.774 | 29.274 |
| 3,000 | 118.670 | 112.545 | 122.549 |
| 5,000 | 215.906 | 211.983 | 227.651 |

## Update

### Single mutation with active bindings

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 0.121 | 0.116 | 0.127 |
| 3,000 | 0.095 | 0.088 | 0.099 |
| 5,000 | 0.087 | 0.083 | 0.091 |

### Bulk mutate all bindings

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 8.694 | 8.255 | 9.111 |
| 3,000 | 32.845 | 30.435 | 35.096 |
| 5,000 | 47.184 | 45.044 | 48.444 |

