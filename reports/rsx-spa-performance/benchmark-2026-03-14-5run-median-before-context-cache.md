# RS-X SPA benchmark median-of-runs report

Date: 2026-03-14
Runs: 5

## Parse

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 8.550 | 8.454 | 8.727 |
| 5,000 | 29.072 | 26.164 | 29.500 |
| 10,000 | 39.212 | 38.430 | 42.164 |

## Bind

### Unique expression per binding

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 33.226 | 32.376 | 33.633 |
| 3,000 | 111.462 | 110.092 | 125.664 |
| 5,000 | 209.342 | 208.457 | 223.109 |

### Cached expression string

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 25.708 | 25.191 | 28.613 |
| 3,000 | 113.850 | 113.061 | 124.331 |
| 5,000 | 205.700 | 204.542 | 214.450 |

## Update

### Single mutation with active bindings

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 0.098 | 0.095 | 0.106 |
| 3,000 | 0.073 | 0.069 | 0.075 |
| 5,000 | 0.067 | 0.065 | 0.071 |

### Bulk mutate all bindings

| Count | Median of run medians (ms) | Min run median (ms) | Max run median (ms) |
| --- | ---: | ---: | ---: |
| 1,000 | 8.324 | 7.844 | 8.640 |
| 3,000 | 28.469 | 28.244 | 30.935 |
| 5,000 | 41.057 | 40.358 | 42.303 |

