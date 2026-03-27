import type {
  BindingPerformanceRow,
  MemoryUsageRow,
  ParseCachePerformanceRow,
  ParsePerformanceRow,
  UpdatePerformanceRow,
} from './performance-report-tables.client';

export const benchmarkMachine = {
  cpu: 'Apple M4',
  memory: '16.0 GB RAM',
  platform: 'darwin/arm64',
  os: '24.6.0',
  node: 'v25.4.0',
  parseOperationsPerSample: 5000,
  benchmarkScript:
    'rs-x-expression-parser/scripts/benchmark-core-concepts-performance.mjs',
  oldReport: 'reports/rsx-core-concepts-performance/benchmark-2026-03-14.json',
  newReport: 'reports/rsx-core-concepts-performance/benchmark-2026-03-25.json',
};

export const parsePerformanceRows: ParsePerformanceRow[] = [
  {
    nodeCount: 1,
    expressionShape: 'v0',
    medianMs: 9.791,
    usPerOperation: 1.96,
    opsPerSecond: 510654,
  },
  {
    nodeCount: 3,
    expressionShape: 'v0 + v1',
    medianMs: 18.604,
    usPerOperation: 3.72,
    opsPerSecond: 268760,
  },
  {
    nodeCount: 7,
    expressionShape: 'v0 + v1 + v2 + v3',
    medianMs: 34.224,
    usPerOperation: 6.84,
    opsPerSecond: 146098,
  },
  {
    nodeCount: 15,
    expressionShape: 'v0 + ... + v7',
    medianMs: 63.174,
    usPerOperation: 12.63,
    opsPerSecond: 79146,
  },
  {
    nodeCount: 31,
    expressionShape: 'v0 + ... + v15',
    medianMs: 120.93,
    usPerOperation: 24.19,
    opsPerSecond: 41346,
  },
  {
    nodeCount: 63,
    expressionShape: 'v0 + ... + v31',
    medianMs: 286.024,
    usPerOperation: 57.2,
    opsPerSecond: 17481,
  },
];

export const parseCachePerformanceRows: ParseCachePerformanceRow[] = [
  {
    nodeCount: 1,
    parseAndCloneMs: 10.343,
    parseAndCloneUsPerOperation: 2.07,
    cloneOnlyMs: 3.943,
    cloneOnlyUsPerOperation: 0.79,
  },
  {
    nodeCount: 3,
    parseAndCloneMs: 21.731,
    parseAndCloneUsPerOperation: 4.35,
    cloneOnlyMs: 10.483,
    cloneOnlyUsPerOperation: 2.1,
  },
  {
    nodeCount: 7,
    parseAndCloneMs: 37.918,
    parseAndCloneUsPerOperation: 7.58,
    cloneOnlyMs: 22.473,
    cloneOnlyUsPerOperation: 4.49,
  },
  {
    nodeCount: 15,
    parseAndCloneMs: 71.355,
    parseAndCloneUsPerOperation: 14.27,
    cloneOnlyMs: 47.688,
    cloneOnlyUsPerOperation: 9.54,
  },
  {
    nodeCount: 31,
    parseAndCloneMs: 131.846,
    parseAndCloneUsPerOperation: 26.37,
    cloneOnlyMs: 98.578,
    cloneOnlyUsPerOperation: 19.72,
  },
  {
    nodeCount: 63,
    parseAndCloneMs: 255.354,
    parseAndCloneUsPerOperation: 51.07,
    cloneOnlyMs: 207.264,
    cloneOnlyUsPerOperation: 41.45,
  },
];

export const bindingPerformanceRows: BindingPerformanceRow[] = [
  {
    bindings: 1000,
    bindUniqueMs: 71.437,
    bindSameExpressionMs: 60.169,
  },
  {
    bindings: 3000,
    bindUniqueMs: 489.113,
    bindSameExpressionMs: 414.515,
  },
  {
    bindings: 5000,
    bindUniqueMs: 1499.889,
    bindSameExpressionMs: 1414.788,
  },
  {
    bindings: 10000,
    bindUniqueMs: 7306.124,
    bindSameExpressionMs: 5859.936,
  },
];

export const updatePerformanceRows: UpdatePerformanceRow[] = [
  {
    bindings: 1000,
    singleUpdateMs: 0.648,
    bulkUpdateMs: 60.724,
  },
  {
    bindings: 3000,
    singleUpdateMs: 1.251,
    bulkUpdateMs: 584.828,
  },
  {
    bindings: 5000,
    singleUpdateMs: 2.556,
    bulkUpdateMs: 1616.546,
  },
  {
    bindings: 10000,
    singleUpdateMs: 4.979,
    bulkUpdateMs: 17778.462,
  },
];

export const memoryUsageRows: MemoryUsageRow[] = [
  { scenario: 'Parse (1 nodes)', medianHeapMb: 11.7, peakRssMb: 93.2 },
  { scenario: 'Parse (3 nodes)', medianHeapMb: 11.9, peakRssMb: 98.9 },
  { scenario: 'Parse (7 nodes)', medianHeapMb: 13.4, peakRssMb: 107.7 },
  { scenario: 'Parse (15 nodes)', medianHeapMb: 16.5, peakRssMb: 109.2 },
  { scenario: 'Parse (31 nodes)', medianHeapMb: 13.8, peakRssMb: 125.8 },
  { scenario: 'Parse (63 nodes)', medianHeapMb: 14.8, peakRssMb: 158.8 },
  { scenario: 'Bind unique (1,000)', medianHeapMb: 94.2, peakRssMb: 276.3 },
  {
    scenario: 'Bind same expression (1,000)',
    medianHeapMb: 168.2,
    peakRssMb: 375.7,
  },
  {
    scenario: 'Single update (1,000)',
    medianHeapMb: 180.8,
    peakRssMb: 393.5,
  },
  { scenario: 'Bulk update (1,000)', medianHeapMb: 242.6, peakRssMb: 403.0 },
  { scenario: 'Bind unique (3,000)', medianHeapMb: 413.1, peakRssMb: 683.2 },
  {
    scenario: 'Bind same expression (3,000)',
    medianHeapMb: 625.9,
    peakRssMb: 894.4,
  },
  {
    scenario: 'Single update (3,000)',
    medianHeapMb: 674.2,
    peakRssMb: 905.1,
  },
  { scenario: 'Bulk update (3,000)', medianHeapMb: 695.1, peakRssMb: 921.5 },
  { scenario: 'Bind unique (5,000)', medianHeapMb: 997.0, peakRssMb: 1305.0 },
  {
    scenario: 'Bind same expression (5,000)',
    medianHeapMb: 1305.2,
    peakRssMb: 1596.0,
  },
  {
    scenario: 'Single update (5,000)',
    medianHeapMb: 1385.9,
    peakRssMb: 1643.0,
  },
  {
    scenario: 'Bulk update (5,000)',
    medianHeapMb: 1438.3,
    peakRssMb: 1646.9,
  },
  {
    scenario: 'Bind unique (10,000)',
    medianHeapMb: 1920.7,
    peakRssMb: 2294.2,
  },
  {
    scenario: 'Bind same expression (10,000)',
    medianHeapMb: 2482.5,
    peakRssMb: 2688.2,
  },
  {
    scenario: 'Single update (10,000)',
    medianHeapMb: 2576.6,
    peakRssMb: 2825.5,
  },
  {
    scenario: 'Bulk update (10,000)',
    medianHeapMb: 2602.4,
    peakRssMb: 2561.5,
  },
];

type ComparisonRow = {
  metric: string;
  unit: 'ms' | 'us/op';
  oldValue: number;
  newValue: number;
  gainPercent: number;
};

const oldRows = {
  parseUsPerOp: [5.482, 6.993, 10.524, 17.71, 25.173, 44.295],
  parseAndCloneUsPerOp: [5.444, 11.013, 15.638, 23.276, 41.113, 80.986],
  bindUniqueMs: [35.092, 121.675, 235.588, 521.444],
  bindSameMs: [25.444, 123.711, 228.468, 638.054],
  singleUpdateMs: [0.089, 0.077, 0.071, 0.107],
  bulkUpdateMs: [7.904, 29.483, 55.091, 146.234],
};

const comparisonRowsBase: ComparisonRow[] = [
  {
    metric: 'Parse 1 nodes',
    unit: 'us/op',
    oldValue: oldRows.parseUsPerOp[0],
    newValue: parsePerformanceRows[0].usPerOperation,
    gainPercent: 0,
  },
  {
    metric: 'Parse 3 nodes',
    unit: 'us/op',
    oldValue: oldRows.parseUsPerOp[1],
    newValue: parsePerformanceRows[1].usPerOperation,
    gainPercent: 0,
  },
  {
    metric: 'Parse 7 nodes',
    unit: 'us/op',
    oldValue: oldRows.parseUsPerOp[2],
    newValue: parsePerformanceRows[2].usPerOperation,
    gainPercent: 0,
  },
  {
    metric: 'Parse 15 nodes',
    unit: 'us/op',
    oldValue: oldRows.parseUsPerOp[3],
    newValue: parsePerformanceRows[3].usPerOperation,
    gainPercent: 0,
  },
  {
    metric: 'Parse 31 nodes',
    unit: 'us/op',
    oldValue: oldRows.parseUsPerOp[4],
    newValue: parsePerformanceRows[4].usPerOperation,
    gainPercent: 0,
  },
  {
    metric: 'Parse 63 nodes',
    unit: 'us/op',
    oldValue: oldRows.parseUsPerOp[5],
    newValue: parsePerformanceRows[5].usPerOperation,
    gainPercent: 0,
  },
  {
    metric: 'Parse+clone 63 nodes',
    unit: 'us/op',
    oldValue: oldRows.parseAndCloneUsPerOp[5],
    newValue: parseCachePerformanceRows[5].parseAndCloneUsPerOperation,
    gainPercent: 0,
  },
  {
    metric: 'Bind unique 1,000',
    unit: 'ms',
    oldValue: oldRows.bindUniqueMs[0],
    newValue: bindingPerformanceRows[0].bindUniqueMs,
    gainPercent: 0,
  },
  {
    metric: 'Bind same 1,000',
    unit: 'ms',
    oldValue: oldRows.bindSameMs[0],
    newValue: bindingPerformanceRows[0].bindSameExpressionMs,
    gainPercent: 0,
  },
  {
    metric: 'Bind unique 10,000',
    unit: 'ms',
    oldValue: oldRows.bindUniqueMs[3],
    newValue: bindingPerformanceRows[3].bindUniqueMs,
    gainPercent: 0,
  },
  {
    metric: 'Bind same 10,000',
    unit: 'ms',
    oldValue: oldRows.bindSameMs[3],
    newValue: bindingPerformanceRows[3].bindSameExpressionMs,
    gainPercent: 0,
  },
  {
    metric: 'Single update 1,000',
    unit: 'ms',
    oldValue: oldRows.singleUpdateMs[0],
    newValue: updatePerformanceRows[0].singleUpdateMs,
    gainPercent: 0,
  },
  {
    metric: 'Bulk update 1,000',
    unit: 'ms',
    oldValue: oldRows.bulkUpdateMs[0],
    newValue: updatePerformanceRows[0].bulkUpdateMs,
    gainPercent: 0,
  },
  {
    metric: 'Single update 10,000',
    unit: 'ms',
    oldValue: oldRows.singleUpdateMs[3],
    newValue: updatePerformanceRows[3].singleUpdateMs,
    gainPercent: 0,
  },
  {
    metric: 'Bulk update 10,000',
    unit: 'ms',
    oldValue: oldRows.bulkUpdateMs[3],
    newValue: updatePerformanceRows[3].bulkUpdateMs,
    gainPercent: 0,
  },
];

export const comparisonRows = comparisonRowsBase.map((row) => ({
  ...row,
  gainPercent: ((row.oldValue - row.newValue) / row.oldValue) * 100,
}));

export const topGainsForReleaseNotes = [...comparisonRows]
  .sort((a, b) => b.gainPercent - a.gainPercent)
  .slice(0, 6);

export const topRegressionsForReleaseNotes = [...comparisonRows]
  .sort((a, b) => a.gainPercent - b.gainPercent)
  .slice(0, 6);
