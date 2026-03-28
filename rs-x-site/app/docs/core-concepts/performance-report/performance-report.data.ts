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
  oldVersion: 'v1.0.0',
  newVersion: 'v2.0.0',
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
    medianMs: 4.015,
    usPerOperation: 0.80,
    opsPerSecond: 1245472,
  },
  {
    nodeCount: 3,
    expressionShape: 'v0 + v1',
    medianMs: 9.759,
    usPerOperation: 1.95,
    opsPerSecond: 512334,
  },
  {
    nodeCount: 7,
    expressionShape: 'v0 + v1 + v2 + v3',
    medianMs: 21.294,
    usPerOperation: 4.26,
    opsPerSecond: 234812,
  },
  {
    nodeCount: 15,
    expressionShape: 'v0 + ... + v7',
    medianMs: 44.277,
    usPerOperation: 8.86,
    opsPerSecond: 112926,
  },
  {
    nodeCount: 31,
    expressionShape: 'v0 + ... + v15',
    medianMs: 89.974,
    usPerOperation: 17.99,
    opsPerSecond: 55572,
  },
  {
    nodeCount: 63,
    expressionShape: 'v0 + ... + v31',
    medianMs: 181.88,
    usPerOperation: 36.38,
    opsPerSecond: 27491,
  },
];

export const parseCachePerformanceRows: ParseCachePerformanceRow[] = [
  {
    nodeCount: 1,
    parseAndCloneMs: 5.108,
    parseAndCloneUsPerOperation: 1.02,
    cloneOnlyMs: 2.829,
    cloneOnlyUsPerOperation: 0.57,
  },
  {
    nodeCount: 3,
    parseAndCloneMs: 11.312,
    parseAndCloneUsPerOperation: 2.26,
    cloneOnlyMs: 8.192,
    cloneOnlyUsPerOperation: 1.64,
  },
  {
    nodeCount: 7,
    parseAndCloneMs: 23.682,
    parseAndCloneUsPerOperation: 4.74,
    cloneOnlyMs: 18.161,
    cloneOnlyUsPerOperation: 3.63,
  },
  {
    nodeCount: 15,
    parseAndCloneMs: 48.103,
    parseAndCloneUsPerOperation: 9.62,
    cloneOnlyMs: 39.06,
    cloneOnlyUsPerOperation: 7.81,
  },
  {
    nodeCount: 31,
    parseAndCloneMs: 98.335,
    parseAndCloneUsPerOperation: 19.67,
    cloneOnlyMs: 81.166,
    cloneOnlyUsPerOperation: 16.23,
  },
  {
    nodeCount: 63,
    parseAndCloneMs: 198.201,
    parseAndCloneUsPerOperation: 39.64,
    cloneOnlyMs: 167.073,
    cloneOnlyUsPerOperation: 33.41,
  },
];

export const bindingPerformanceRows: BindingPerformanceRow[] = [
  {
    bindings: 1000,
    bindUniqueMs: 37.953,
    bindSameExpressionMs: 49.136,
  },
  {
    bindings: 3000,
    bindUniqueMs: 116.509,
    bindSameExpressionMs: 138.636,
  },
  {
    bindings: 5000,
    bindUniqueMs: 196.705,
    bindSameExpressionMs: 208.961,
  },
  {
    bindings: 10000,
    bindUniqueMs: 422.299,
    bindSameExpressionMs: 420.085,
  },
];

export const updatePerformanceRows: UpdatePerformanceRow[] = [
  {
    bindings: 1000,
    singleUpdateMs: 0.022,
    bulkUpdateMs: 2.599,
  },
  {
    bindings: 3000,
    singleUpdateMs: 0.003,
    bulkUpdateMs: 18.081,
  },
  {
    bindings: 5000,
    singleUpdateMs: 0.003,
    bulkUpdateMs: 25.226,
  },
  {
    bindings: 10000,
    singleUpdateMs: 0.002,
    bulkUpdateMs: 48.639,
  },
];

export type IdentifierOnlyBindingPerformanceRow = {
  bindings: number;
  bindMs: number;
  bindInitializedMs: number;
  singleUpdateMs: number;
  bulkUpdateMs: number;
};

export const identifierOnlyBindingPerformanceRows: IdentifierOnlyBindingPerformanceRow[] =
  [
    {
      bindings: 100,
      bindMs: 5.438,
      bindInitializedMs: 3.642,
      singleUpdateMs: 0.067,
      bulkUpdateMs: 0.850,
    },
    {
      bindings: 500,
      bindMs: 15.296,
      bindInitializedMs: 16.851,
      singleUpdateMs: 0.064,
      bulkUpdateMs: 4.067,
    },
    {
      bindings: 1000,
      bindMs: 28.958,
      bindInitializedMs: 29.027,
      singleUpdateMs: 0.065,
      bulkUpdateMs: 7.521,
    },
    {
      bindings: 3000,
      bindMs: 102.882,
      bindInitializedMs: 104.762,
      singleUpdateMs: 0.067,
      bulkUpdateMs: 18.631,
    },
    {
      bindings: 5000,
      bindMs: 175.141,
      bindInitializedMs: 175.905,
      singleUpdateMs: 0.067,
      bulkUpdateMs: 28.075,
    },
    {
      bindings: 10000,
      bindMs: 341.751,
      bindInitializedMs: 342.662,
      singleUpdateMs: 0.081,
      bulkUpdateMs: 52.867,
    },
  ];

export const memoryUsageRows: MemoryUsageRow[] = [
  { scenario: 'Parse (1 nodes)', medianHeapMb: 14.0, peakRssMb: 96.3 },
  { scenario: 'Parse (3 nodes)', medianHeapMb: 12.5, peakRssMb: 102.3 },
  { scenario: 'Parse (7 nodes)', medianHeapMb: 14.7, peakRssMb: 110.6 },
  { scenario: 'Parse (15 nodes)', medianHeapMb: 19.0, peakRssMb: 111.4 },
  { scenario: 'Parse (31 nodes)', medianHeapMb: 18.9, peakRssMb: 128.0 },
  { scenario: 'Parse (63 nodes)', medianHeapMb: 25.0, peakRssMb: 128.8 },
  { scenario: 'Bind unique (1,000)', medianHeapMb: 160.0, peakRssMb: 368.5 },
  { scenario: 'Bind same expression (1,000)', medianHeapMb: 152.4, peakRssMb: 377.7 },
  { scenario: 'Single update (1,000)', medianHeapMb: 64.5, peakRssMb: 393.7 },
  { scenario: 'Bulk update (1,000)', medianHeapMb: 70.1, peakRssMb: 393.8 },
  { scenario: 'Bind unique (3,000)', medianHeapMb: 441.0, peakRssMb: 771.7 },
  { scenario: 'Bind same expression (3,000)', medianHeapMb: 416.3, peakRssMb: 793.5 },
  { scenario: 'Single update (3,000)', medianHeapMb: 171.0, peakRssMb: 810.2 },
  { scenario: 'Bulk update (3,000)', medianHeapMb: 185.3, peakRssMb: 811.4 },
  { scenario: 'Bind unique (5,000)', medianHeapMb: 685.3, peakRssMb: 1077.3 },
  { scenario: 'Bind same expression (5,000)', medianHeapMb: 640.8, peakRssMb: 1093.9 },
  { scenario: 'Single update (5,000)', medianHeapMb: 282.9, peakRssMb: 1108.3 },
  { scenario: 'Bulk update (5,000)', medianHeapMb: 306.6, peakRssMb: 1109.0 },
  { scenario: 'Bind unique (10,000)', medianHeapMb: 1186.4, peakRssMb: 1684.4 },
  { scenario: 'Bind same expression (10,000)', medianHeapMb: 1169.6, peakRssMb: 1673.6 },
  { scenario: 'Single update (10,000)', medianHeapMb: 554.4, peakRssMb: 1704.3 },
  { scenario: 'Bulk update (10,000)', medianHeapMb: 601.3, peakRssMb: 1706.5 },
  { scenario: 'Bind+initialize unique (1,000)', medianHeapMb: 162.0, peakRssMb: 392.5 },
  { scenario: 'Bind+initialize same expression (1,000)', medianHeapMb: 151.6, peakRssMb: 393.3 },
  { scenario: 'Bind+initialize unique (3,000)', medianHeapMb: 445.3, peakRssMb: 830.5 },
  { scenario: 'Bind+initialize same expression (3,000)', medianHeapMb: 414.8, peakRssMb: 810.0 },
  { scenario: 'Bind+initialize unique (5,000)', medianHeapMb: 694.9, peakRssMb: 1132.7 },
  { scenario: 'Bind+initialize same expression (5,000)', medianHeapMb: 640.2, peakRssMb: 1109.0 },
  { scenario: 'Bind+initialize unique (10,000)', medianHeapMb: 1207.6, peakRssMb: 1753.1 },
  { scenario: 'Bind+initialize same expression (10,000)', medianHeapMb: 1168.9, peakRssMb: 1710.7 },
  { scenario: 'Identifier-only bind (1,000)', medianHeapMb: 246.9, peakRssMb: 1697.1 },
  { scenario: 'Identifier-only bind+initialize (1,000)', medianHeapMb: 246.6, peakRssMb: 1697.2 },
  { scenario: 'Identifier-only single update (1,000)', medianHeapMb: 217.7, peakRssMb: 1697.3 },
  { scenario: 'Identifier-only bulk update (1,000)', medianHeapMb: 222.5, peakRssMb: 1697.3 },
  { scenario: 'Identifier-only bind (3,000)', medianHeapMb: 360.8, peakRssMb: 1691.0 },
  { scenario: 'Identifier-only bind+initialize (3,000)', medianHeapMb: 360.6, peakRssMb: 1681.9 },
  { scenario: 'Identifier-only single update (3,000)', medianHeapMb: 283.1, peakRssMb: 1681.9 },
  { scenario: 'Identifier-only bulk update (3,000)', medianHeapMb: 296.9, peakRssMb: 1682.0 },
  { scenario: 'Identifier-only bind (5,000)', medianHeapMb: 456.5, peakRssMb: 1694.6 },
  { scenario: 'Identifier-only bind+initialize (5,000)', medianHeapMb: 456.3, peakRssMb: 1688.7 },
  { scenario: 'Identifier-only single update (5,000)', medianHeapMb: 345.4, peakRssMb: 1688.9 },
  { scenario: 'Identifier-only bulk update (5,000)', medianHeapMb: 368.4, peakRssMb: 1689.0 },
  { scenario: 'Identifier-only bind (10,000)', medianHeapMb: 751.6, peakRssMb: 1697.1 },
  { scenario: 'Identifier-only bind+initialize (10,000)', medianHeapMb: 751.2, peakRssMb: 1697.2 },
  { scenario: 'Identifier-only single update (10,000)', medianHeapMb: 499.9, peakRssMb: 1690.4 },
  { scenario: 'Identifier-only bulk update (10,000)', medianHeapMb: 545.3, peakRssMb: 1690.9 },
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
  .filter((row) => row.gainPercent > 0)
  .sort((a, b) => b.gainPercent - a.gainPercent);

export const topRegressionsForReleaseNotes = [...comparisonRows]
  .filter((row) => row.gainPercent < 0)
  .sort((a, b) => a.gainPercent - b.gainPercent);
