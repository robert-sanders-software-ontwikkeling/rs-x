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
  newReport: 'reports/rsx-core-concepts-performance/benchmark-2026-03-28.json',
};

export type SharedIdentifierBindingRow = {
  expressionCount: number;
  sharedIdentifierCount: number;
  watchStateCalls: number;
  newSubscriptions: number;
  totalMs: number;
  msPerExpression: number;
};

export type BindingStressGcEvidenceRow = {
  expressionCount: number;
  bindMedianMs: number;
  disposeMedianMs: number;
  gcMedianMs: number;
  heapAfterMedianMb: number;
  rssAfterMedianMb: number;
};

export const sharedIdentifierBindingRows: SharedIdentifierBindingRow[] = [
  {
    expressionCount: 1000,
    sharedIdentifierCount: 10,
    watchStateCalls: 10,
    newSubscriptions: 10,
    totalMs: 170.32,
    msPerExpression: 0.17032,
  },
  {
    expressionCount: 3000,
    sharedIdentifierCount: 10,
    watchStateCalls: 10,
    newSubscriptions: 10,
    totalMs: 222.28,
    msPerExpression: 0.07409,
  },
  {
    expressionCount: 5000,
    sharedIdentifierCount: 10,
    watchStateCalls: 10,
    newSubscriptions: 10,
    totalMs: 296.69,
    msPerExpression: 0.05934,
  },
  {
    expressionCount: 10000,
    sharedIdentifierCount: 10,
    watchStateCalls: 10,
    newSubscriptions: 10,
    totalMs: 725.84,
    msPerExpression: 0.07258,
  },
];

export const bindingStressGcEvidenceRows: BindingStressGcEvidenceRow[] = [
  {
    expressionCount: 1000,
    bindMedianMs: 106.37,
    disposeMedianMs: 13.77,
    gcMedianMs: 18.9,
    heapAfterMedianMb: 75.33,
    rssAfterMedianMb: 291.7,
  },
  {
    expressionCount: 2000,
    bindMedianMs: 313.86,
    disposeMedianMs: 63.81,
    gcMedianMs: 49.22,
    heapAfterMedianMb: 234.27,
    rssAfterMedianMb: 479.45,
  },
  {
    expressionCount: 3000,
    bindMedianMs: 696.09,
    disposeMedianMs: 103.58,
    gcMedianMs: 101.23,
    heapAfterMedianMb: 490.14,
    rssAfterMedianMb: 748.98,
  },
  {
    expressionCount: 4000,
    bindMedianMs: 1237.93,
    disposeMedianMs: 147.08,
    gcMedianMs: 183.21,
    heapAfterMedianMb: 840.86,
    rssAfterMedianMb: 1129.27,
  },
  {
    expressionCount: 10000,
    bindMedianMs: 6010.15,
    disposeMedianMs: 713.42,
    gcMedianMs: 64.02,
    heapAfterMedianMb: 335.13,
    rssAfterMedianMb: 718.98,
  },
];

export const parsePerformanceRows: ParsePerformanceRow[] = [
  {
    nodeCount: 1,
    expressionShape: 'v0',
    medianMs: 10.721,
    usPerOperation: 2.14,
    opsPerSecond: 466367,
  },
  {
    nodeCount: 3,
    expressionShape: 'v0 + v1',
    medianMs: 16.676,
    usPerOperation: 3.34,
    opsPerSecond: 299826,
  },
  {
    nodeCount: 7,
    expressionShape: 'v0 + v1 + v2 + v3',
    medianMs: 38.78,
    usPerOperation: 7.76,
    opsPerSecond: 128933,
  },
  {
    nodeCount: 15,
    expressionShape: 'v0 + ... + v7',
    medianMs: 67.865,
    usPerOperation: 13.57,
    opsPerSecond: 73676,
  },
  {
    nodeCount: 31,
    expressionShape: 'v0 + ... + v15',
    medianMs: 161.509,
    usPerOperation: 32.3,
    opsPerSecond: 30958,
  },
  {
    nodeCount: 63,
    expressionShape: 'v0 + ... + v31',
    medianMs: 289.189,
    usPerOperation: 57.84,
    opsPerSecond: 17290,
  },
];

export const parseCachePerformanceRows: ParseCachePerformanceRow[] = [
  {
    nodeCount: 1,
    parseAndCloneMs: 12.997,
    parseAndCloneUsPerOperation: 2.6,
    cloneOnlyMs: 3.554,
    cloneOnlyUsPerOperation: 0.71,
  },
  {
    nodeCount: 3,
    parseAndCloneMs: 27.494,
    parseAndCloneUsPerOperation: 5.5,
    cloneOnlyMs: 10.57,
    cloneOnlyUsPerOperation: 2.11,
  },
  {
    nodeCount: 7,
    parseAndCloneMs: 43.184,
    parseAndCloneUsPerOperation: 8.64,
    cloneOnlyMs: 23.849,
    cloneOnlyUsPerOperation: 4.77,
  },
  {
    nodeCount: 15,
    parseAndCloneMs: 87.194,
    parseAndCloneUsPerOperation: 17.44,
    cloneOnlyMs: 52.022,
    cloneOnlyUsPerOperation: 10.4,
  },
  {
    nodeCount: 31,
    parseAndCloneMs: 183.119,
    parseAndCloneUsPerOperation: 36.62,
    cloneOnlyMs: 138.149,
    cloneOnlyUsPerOperation: 27.63,
  },
  {
    nodeCount: 63,
    parseAndCloneMs: 319.938,
    parseAndCloneUsPerOperation: 63.99,
    cloneOnlyMs: 258.886,
    cloneOnlyUsPerOperation: 51.78,
  },
];

export const bindingPerformanceRows: BindingPerformanceRow[] = [
  {
    bindings: 1000,
    bindUniqueMs: 66.705,
    bindSameExpressionMs: 58.205,
  },
  {
    bindings: 3000,
    bindUniqueMs: 269.855,
    bindSameExpressionMs: 266.118,
  },
  {
    bindings: 5000,
    bindUniqueMs: 434.406,
    bindSameExpressionMs: 420.283,
  },
  {
    bindings: 10000,
    bindUniqueMs: 920.842,
    bindSameExpressionMs: 833.943,
  },
];

export const updatePerformanceRows: UpdatePerformanceRow[] = [
  {
    bindings: 1000,
    singleUpdateMs: 0.201,
    bulkUpdateMs: 21.793,
  },
  {
    bindings: 3000,
    singleUpdateMs: 0.124,
    bulkUpdateMs: 27.873,
  },
  {
    bindings: 5000,
    singleUpdateMs: 0.099,
    bulkUpdateMs: 50.828,
  },
  {
    bindings: 10000,
    singleUpdateMs: 0.126,
    bulkUpdateMs: 129.602,
  },
];

export const memoryUsageRows: MemoryUsageRow[] = [
  { scenario: 'Parse (1 nodes)', medianHeapMb: 14.2, peakRssMb: 92.4 },
  { scenario: 'Parse (3 nodes)', medianHeapMb: 12.6, peakRssMb: 97.8 },
  { scenario: 'Parse (7 nodes)', medianHeapMb: 14.8, peakRssMb: 107.0 },
  { scenario: 'Parse (15 nodes)', medianHeapMb: 11.6, peakRssMb: 108.1 },
  { scenario: 'Parse (31 nodes)', medianHeapMb: 19.1, peakRssMb: 124.8 },
  { scenario: 'Parse (63 nodes)', medianHeapMb: 25.1, peakRssMb: 125.4 },
  { scenario: 'Bind unique (1,000)', medianHeapMb: 160.1, peakRssMb: 359.7 },
  {
    scenario: 'Bind same expression (1,000)',
    medianHeapMb: 152.5,
    peakRssMb: 368.4,
  },
  {
    scenario: 'Single update (1,000)',
    medianHeapMb: 64.7,
    peakRssMb: 383.6,
  },
  { scenario: 'Bulk update (1,000)', medianHeapMb: 70.2, peakRssMb: 383.6 },
  { scenario: 'Bind unique (3,000)', medianHeapMb: 441.1, peakRssMb: 780.5 },
  {
    scenario: 'Bind same expression (3,000)',
    medianHeapMb: 416.7,
    peakRssMb: 802.1,
  },
  {
    scenario: 'Single update (3,000)',
    medianHeapMb: 171.1,
    peakRssMb: 816.9,
  },
  { scenario: 'Bulk update (3,000)', medianHeapMb: 185.4, peakRssMb: 817.8 },
  { scenario: 'Bind unique (5,000)', medianHeapMb: 685.9, peakRssMb: 1081.0 },
  {
    scenario: 'Bind same expression (5,000)',
    medianHeapMb: 642.8,
    peakRssMb: 1089.9,
  },
  {
    scenario: 'Single update (5,000)',
    medianHeapMb: 283.0,
    peakRssMb: 1108.0,
  },
  {
    scenario: 'Bulk update (5,000)',
    medianHeapMb: 306.6,
    peakRssMb: 1108.4,
  },
  {
    scenario: 'Bind unique (10,000)',
    medianHeapMb: 1188.6,
    peakRssMb: 1685.6,
  },
  {
    scenario: 'Bind same expression (10,000)',
    medianHeapMb: 1129.6,
    peakRssMb: 1675.2,
  },
  {
    scenario: 'Single update (10,000)',
    medianHeapMb: 554.5,
    peakRssMb: 1703.0,
  },
  {
    scenario: 'Bulk update (10,000)',
    medianHeapMb: 601.4,
    peakRssMb: 1703.4,
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
