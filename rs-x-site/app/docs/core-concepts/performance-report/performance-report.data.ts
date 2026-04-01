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
  newReport: 'reports/rsx-core-concepts-performance/benchmark-2026-03-31.json',
};

export const expressionEngineModeBenchmark = {
  date: '2026-03-31',
  benchmarkScript:
    'rs-x-expression-parser/scripts/benchmark-angular-signals-comparison.mjs',
  compiledReport:
    'reports/angular-signals-comparison/benchmark-2026-03-31-compiled.json',
  treeReport: 'reports/angular-signals-comparison/benchmark-2026-03-31-tree.json',
};

export type ExpressionEngineModeComparisonRow = {
  scenario: string;
  bindings: number;
  metric: 'bind' | 'single update' | 'bulk update';
  compiledMs: number;
  treeMs: number;
  improvementPercent: number;
};

export type ExpressionEngineModeScaleRow = {
  bindings: number;
  compiled: {
    bindMs: number;
    singleUpdateMs: number;
    bulkUpdateMs: number;
  };
  tree: {
    bindMs: number;
    singleUpdateMs: number;
    bulkUpdateMs: number;
  };
};

export type ExpressionEngineModeMemoryRow = {
  scenario: string;
  bindings: number;
  metric: 'bind' | 'single update' | 'bulk update' | 'dispose';
  compiledHeapMedianMb: number;
  treeHeapMedianMb: number;
  compiledPeakRssMb: number;
  treePeakRssMb: number;
};

const toImprovementPercent = (compiledMs: number, treeMs: number): number =>
  ((treeMs - compiledMs) / treeMs) * 100;

export const expressionEngineModeComparisonRows: ExpressionEngineModeComparisonRow[] = [
  {
    scenario: 'Sync identifier',
    bindings: 1000,
    metric: 'bind',
    compiledMs: 30.12854199999998,
    treeMs: 27.327291000000002,
    improvementPercent: toImprovementPercent(30.12854199999998, 27.327291000000002),
  },
  {
    scenario: 'Sync identifier',
    bindings: 1000,
    metric: 'single update',
    compiledMs: 0.09468749999996362,
    treeMs: 0.07191700000001333,
    improvementPercent: toImprovementPercent(
      0.09468749999996362,
      0.07191700000001333,
    ),
  },
  {
    scenario: 'Sync identifier',
    bindings: 1000,
    metric: 'bulk update',
    compiledMs: 5.1485625000000255,
    treeMs: 4.60458349999999,
    improvementPercent: toImprovementPercent(5.1485625000000255, 4.60458349999999),
  },
  {
    scenario: 'Async identifier',
    bindings: 1000,
    metric: 'bind',
    compiledMs: 32.376500000000306,
    treeMs: 30.713917000000947,
    improvementPercent: toImprovementPercent(
      32.376500000000306,
      30.713917000000947,
    ),
  },
  {
    scenario: 'Async identifier',
    bindings: 1000,
    metric: 'single update',
    compiledMs: 0.04841699999997218,
    treeMs: 0.04720799999904557,
    improvementPercent: toImprovementPercent(
      0.04841699999997218,
      0.04720799999904557,
    ),
  },
  {
    scenario: 'Async identifier',
    bindings: 1000,
    metric: 'bulk update',
    compiledMs: 6.487812499999563,
    treeMs: 5.8583334999993895,
    improvementPercent: toImprovementPercent(6.487812499999563, 5.8583334999993895),
  },
  {
    scenario: 'Same-model generated expressions',
    bindings: 1000,
    metric: 'bind',
    compiledMs: 11.883583999995608,
    treeMs: 358.38666699999885,
    improvementPercent: toImprovementPercent(11.883583999995608, 358.38666699999885),
  },
  {
    scenario: 'Same-model generated expressions',
    bindings: 1000,
    metric: 'single update',
    compiledMs: 5.559500000003027,
    treeMs: 49.734292000001005,
    improvementPercent: toImprovementPercent(5.559500000003027, 49.734292000001005),
  },
  {
    scenario: 'Same-model generated expressions',
    bindings: 1000,
    metric: 'bulk update',
    compiledMs: 34.88695800000278,
    treeMs: 393.4380830000009,
    improvementPercent: toImprovementPercent(34.88695800000278, 393.4380830000009),
  },
];

export const expressionEngineModeSyncRows: ExpressionEngineModeScaleRow[] = [
  {
    bindings: 1000,
    compiled: {
      bindMs: 30.12854199999998,
      singleUpdateMs: 0.09468749999996362,
      bulkUpdateMs: 5.1485625000000255,
    },
    tree: {
      bindMs: 27.327291000000002,
      singleUpdateMs: 0.07191700000001333,
      bulkUpdateMs: 4.60458349999999,
    },
  },
  {
    bindings: 3000,
    compiled: {
      bindMs: 93.43929100000014,
      singleUpdateMs: 0.06285449999995762,
      bulkUpdateMs: 14.595667000000049,
    },
    tree: {
      bindMs: 92.21675000000005,
      singleUpdateMs: 0.0559170000000222,
      bulkUpdateMs: 13.523124999999936,
    },
  },
  {
    bindings: 5000,
    compiled: {
      bindMs: 156.83772900000008,
      singleUpdateMs: 0.06725000000005821,
      bulkUpdateMs: 25.580124999999498,
    },
    tree: {
      bindMs: 153.98216649999995,
      singleUpdateMs: 0.06691599999976461,
      bulkUpdateMs: 22.60649999999987,
    },
  },
  {
    bindings: 10000,
    compiled: {
      bindMs: 356.8040410000003,
      singleUpdateMs: 0.07287450000058016,
      bulkUpdateMs: 48.76597900000161,
    },
    tree: {
      bindMs: 318.20829199999935,
      singleUpdateMs: 0.06341649999967558,
      bulkUpdateMs: 41.532687500000065,
    },
  },
];

export const expressionEngineModeAsyncRows: ExpressionEngineModeScaleRow[] = [
  {
    bindings: 1000,
    compiled: {
      bindMs: 32.376500000000306,
      singleUpdateMs: 0.04841699999997218,
      bulkUpdateMs: 6.487812499999563,
    },
    tree: {
      bindMs: 30.713917000000947,
      singleUpdateMs: 0.04720799999904557,
      bulkUpdateMs: 5.8583334999993895,
    },
  },
  {
    bindings: 3000,
    compiled: {
      bindMs: 121.32733399999961,
      singleUpdateMs: 0.05179199999929551,
      bulkUpdateMs: 17.81708350000008,
    },
    tree: {
      bindMs: 114.63029199999983,
      singleUpdateMs: 0.050103999999919324,
      bulkUpdateMs: 16.75664600000073,
    },
  },
  {
    bindings: 5000,
    compiled: {
      bindMs: 210.47331249999843,
      singleUpdateMs: 0.05837500000052387,
      bulkUpdateMs: 29.547500000000582,
    },
    tree: {
      bindMs: 192.15904150000097,
      singleUpdateMs: 0.04333299999780138,
      bulkUpdateMs: 27.54083300000275,
    },
  },
  {
    bindings: 10000,
    compiled: {
      bindMs: 426.00295800000094,
      singleUpdateMs: 0.06241700000100536,
      bulkUpdateMs: 55.591520999998465,
    },
    tree: {
      bindMs: 400.4684159999997,
      singleUpdateMs: 0.054916499999308144,
      bulkUpdateMs: 50.62377100000231,
    },
  },
];

export const expressionEngineModeSameModelRow = {
  bindings: 1000,
  bulkRounds: 10,
  compiled: {
    bindMs: 11.883583999995608,
    disposeMs: 1.9452910000036354,
    singleUpdateMs: 5.559500000003027,
    bulkUpdateMs: 34.88695800000278,
  },
  tree: {
    bindMs: 358.38666699999885,
    disposeMs: 24.203083000000333,
    singleUpdateMs: 49.734292000001005,
    bulkUpdateMs: 393.4380830000009,
  },
};

export const expressionEngineModeMemoryRows: ExpressionEngineModeMemoryRow[] = [
  {
    scenario: 'Sync identifier',
    bindings: 1000,
    metric: 'bind',
    compiledHeapMedianMb: 74.03609466552734,
    treeHeapMedianMb: 76.03971862792969,
    compiledPeakRssMb: 222.515625,
    treePeakRssMb: 218.3125,
  },
  {
    scenario: 'Sync identifier',
    bindings: 1000,
    metric: 'single update',
    compiledHeapMedianMb: 51.01032257080078,
    treeHeapMedianMb: 47.10154724121094,
    compiledPeakRssMb: 222.71875,
    treePeakRssMb: 218.1953125,
  },
  {
    scenario: 'Sync identifier',
    bindings: 1000,
    metric: 'bulk update',
    compiledHeapMedianMb: 55.21657180786133,
    treeHeapMedianMb: 51.191612243652344,
    compiledPeakRssMb: 223.4296875,
    treePeakRssMb: 218.7578125,
  },
  {
    scenario: 'Async identifier',
    bindings: 1000,
    metric: 'bind',
    compiledHeapMedianMb: 164.72771453857422,
    treeHeapMedianMb: 170.0379638671875,
    compiledPeakRssMb: 719.578125,
    treePeakRssMb: 729.640625,
  },
  {
    scenario: 'Async identifier',
    bindings: 1000,
    metric: 'single update',
    compiledHeapMedianMb: 149.295654296875,
    treeHeapMedianMb: 150.39550018310547,
    compiledPeakRssMb: 719.59375,
    treePeakRssMb: 729.65625,
  },
  {
    scenario: 'Async identifier',
    bindings: 1000,
    metric: 'bulk update',
    compiledHeapMedianMb: 152.3343734741211,
    treeHeapMedianMb: 153.27984619140625,
    compiledPeakRssMb: 719.609375,
    treePeakRssMb: 729.78125,
  },
  {
    scenario: 'Same-model generated expressions',
    bindings: 1000,
    metric: 'bind',
    compiledHeapMedianMb: 515.2999801635742,
    treeHeapMedianMb: 1499.7401962280273,
    compiledPeakRssMb: 1103.71875,
    treePeakRssMb: 1734.859375,
  },
  {
    scenario: 'Same-model generated expressions',
    bindings: 1000,
    metric: 'dispose',
    compiledHeapMedianMb: 515.2999801635742,
    treeHeapMedianMb: 1499.7401962280273,
    compiledPeakRssMb: 1103.71875,
    treePeakRssMb: 1734.859375,
  },
  {
    scenario: 'Same-model generated expressions',
    bindings: 1000,
    metric: 'single update',
    compiledHeapMedianMb: 512.2549591064453,
    treeHeapMedianMb: 1495.7198638916016,
    compiledPeakRssMb: 1104.171875,
    treePeakRssMb: 1741.125,
  },
  {
    scenario: 'Same-model generated expressions',
    bindings: 1000,
    metric: 'bulk update',
    compiledHeapMedianMb: 533.0633697509766,
    treeHeapMedianMb: 1527.3117904663086,
    compiledPeakRssMb: 1104.609375,
    treePeakRssMb: 1759.390625,
  },
];

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
    medianMs: 3.653,
    usPerOperation: 0.731,
    opsPerSecond: 1368847,
  },
  {
    nodeCount: 3,
    expressionShape: 'v0 + v1',
    medianMs: 9.331,
    usPerOperation: 1.866,
    opsPerSecond: 535839,
  },
  {
    nodeCount: 7,
    expressionShape: 'v0 + v1 + v2 + v3',
    medianMs: 20.475,
    usPerOperation: 4.095,
    opsPerSecond: 244205,
  },
  {
    nodeCount: 15,
    expressionShape: 'v0 + ... + v7',
    medianMs: 42.432,
    usPerOperation: 8.486,
    opsPerSecond: 117836,
  },
  {
    nodeCount: 31,
    expressionShape: 'v0 + ... + v15',
    medianMs: 87.641,
    usPerOperation: 17.528,
    opsPerSecond: 57051,
  },
  {
    nodeCount: 63,
    expressionShape: 'v0 + ... + v31',
    medianMs: 178.090,
    usPerOperation: 35.618,
    opsPerSecond: 28076,
  },
];

// Tree mode: parseAndClone grows with size (full tree traversal); cloneOnly also grows.
// Compiled mode: parseAndClone is slower (includes compilation); cloneOnly is fast and flat (cached plan reuse).
export const parseCachePerformanceRows: ParseCachePerformanceRow[] = [
  {
    nodeCount: 1,
    parseAndCloneMs: 5.611,
    parseAndCloneUsPerOperation: 1.122,
    cloneOnlyMs: 2.717,
    cloneOnlyUsPerOperation: 0.543,
  },
  {
    nodeCount: 3,
    parseAndCloneMs: 12.015,
    parseAndCloneUsPerOperation: 2.403,
    cloneOnlyMs: 7.935,
    cloneOnlyUsPerOperation: 1.587,
  },
  {
    nodeCount: 7,
    parseAndCloneMs: 23.535,
    parseAndCloneUsPerOperation: 4.707,
    cloneOnlyMs: 17.898,
    cloneOnlyUsPerOperation: 3.580,
  },
  {
    nodeCount: 15,
    parseAndCloneMs: 47.499,
    parseAndCloneUsPerOperation: 9.500,
    cloneOnlyMs: 37.934,
    cloneOnlyUsPerOperation: 7.587,
  },
  {
    nodeCount: 31,
    parseAndCloneMs: 95.965,
    parseAndCloneUsPerOperation: 19.193,
    cloneOnlyMs: 78.644,
    cloneOnlyUsPerOperation: 15.729,
  },
  {
    nodeCount: 63,
    parseAndCloneMs: 191.709,
    parseAndCloneUsPerOperation: 38.342,
    cloneOnlyMs: 161.554,
    cloneOnlyUsPerOperation: 32.311,
  },
];

// Tree mode binding performance (benchmark-2026-03-31-tree.json)
export const bindingPerformanceRows: BindingPerformanceRow[] = [
  {
    bindings: 1000,
    bindUniqueMs: 38.350,
    bindSameExpressionMs: 43.373,
  },
  {
    bindings: 3000,
    bindUniqueMs: 143.833,
    bindSameExpressionMs: 142.731,
  },
  {
    bindings: 5000,
    bindUniqueMs: 260.666,
    bindSameExpressionMs: 298.487,
  },
  {
    bindings: 10000,
    bindUniqueMs: 737.067,
    bindSameExpressionMs: 884.867,
  },
];

// Compiled mode binding performance (benchmark-2026-03-31-compiled.json)
export const compiledBindingPerformanceRows: BindingPerformanceRow[] = [
  {
    bindings: 1000,
    bindUniqueMs: 32.317,
    bindSameExpressionMs: 45.661,
  },
  {
    bindings: 3000,
    bindUniqueMs: 106.509,
    bindSameExpressionMs: 157.647,
  },
  {
    bindings: 5000,
    bindUniqueMs: 193.635,
    bindSameExpressionMs: 247.696,
  },
  {
    bindings: 10000,
    bindUniqueMs: 561.750,
    bindSameExpressionMs: 440.759,
  },
];

// Tree mode update performance (benchmark-2026-03-31-tree.json)
export const updatePerformanceRows: UpdatePerformanceRow[] = [
  {
    bindings: 1000,
    singleUpdateMs: 0.008584,
    bulkUpdateMs: 2.388,
  },
  {
    bindings: 3000,
    singleUpdateMs: 0.002979,
    bulkUpdateMs: 13.048,
  },
  {
    bindings: 5000,
    singleUpdateMs: 0.001750,
    bulkUpdateMs: 21.263,
  },
  {
    bindings: 10000,
    singleUpdateMs: 0.002083,
    bulkUpdateMs: 72.809,
  },
];

// Compiled mode update performance (benchmark-2026-03-31-compiled.json)
export const compiledUpdatePerformanceRows: UpdatePerformanceRow[] = [
  {
    bindings: 1000,
    singleUpdateMs: 0.008292,
    bulkUpdateMs: 2.873,
  },
  {
    bindings: 3000,
    singleUpdateMs: 0.002958,
    bulkUpdateMs: 18.277,
  },
  {
    bindings: 5000,
    singleUpdateMs: 0.002313,
    bulkUpdateMs: 28.310,
  },
  {
    bindings: 10000,
    singleUpdateMs: 0.002396,
    bulkUpdateMs: 61.112,
  },
];

export type IdentifierOnlyBindingPerformanceRow = {
  bindings: number;
  bindMs: number;
  bindInitializedMs: number;
  singleUpdateMs: number;
  bulkUpdateMs: number;
};

// Tree mode identifier-only binding performance (benchmark-2026-03-31-tree.json)
export const identifierOnlyBindingPerformanceRows: IdentifierOnlyBindingPerformanceRow[] =
  [
    {
      bindings: 100,
      bindMs: 2.256,
      bindInitializedMs: 371.406,
      singleUpdateMs: 0.008375,
      bulkUpdateMs: 26.464,
    },
    {
      bindings: 500,
      bindMs: 70.174,
      bindInitializedMs: 95.432,
      singleUpdateMs: 0.008083,
      bulkUpdateMs: 4.658,
    },
    {
      bindings: 1000,
      bindMs: 66.185,
      bindInitializedMs: 111.798,
      singleUpdateMs: 0.001771,
      bulkUpdateMs: 3.010,
    },
    {
      bindings: 3000,
      bindMs: 161.463,
      bindInitializedMs: 234.292,
      singleUpdateMs: 0.002792,
      bulkUpdateMs: 37.485,
    },
    {
      bindings: 5000,
      bindMs: 275.182,
      bindInitializedMs: 309.953,
      singleUpdateMs: 0.001708,
      bulkUpdateMs: 24.942,
    },
    {
      bindings: 10000,
      bindMs: 758.932,
      bindInitializedMs: 902.250,
      singleUpdateMs: 0.001959,
      bulkUpdateMs: 55.082,
    },
  ];

export type IdentifierOnlyEngineModeRow = {
  bindings: number;
  compiled: {
    bindMs: number;
    singleUpdateMs: number;
    bulkUpdateMs: number;
  };
  tree: {
    bindMs: number;
    singleUpdateMs: number;
    bulkUpdateMs: number;
  };
};

export const identifierOnlyEngineModeRows: IdentifierOnlyEngineModeRow[] = [
  {
    bindings: 1000,
    compiled: {
      bindMs: 30.12854199999998,
      singleUpdateMs: 0.09468749999996362,
      bulkUpdateMs: 5.1485625000000255,
    },
    tree: {
      bindMs: 27.327291000000002,
      singleUpdateMs: 0.07191700000001333,
      bulkUpdateMs: 4.60458349999999,
    },
  },
  {
    bindings: 3000,
    compiled: {
      bindMs: 93.43929100000014,
      singleUpdateMs: 0.06285449999995762,
      bulkUpdateMs: 14.595667000000049,
    },
    tree: {
      bindMs: 92.21675000000005,
      singleUpdateMs: 0.0559170000000222,
      bulkUpdateMs: 13.523124999999936,
    },
  },
  {
    bindings: 5000,
    compiled: {
      bindMs: 156.83772900000008,
      singleUpdateMs: 0.06725000000005821,
      bulkUpdateMs: 25.580124999999498,
    },
    tree: {
      bindMs: 153.98216649999995,
      singleUpdateMs: 0.06691599999976461,
      bulkUpdateMs: 22.60649999999987,
    },
  },
  {
    bindings: 10000,
    compiled: {
      bindMs: 356.8040410000003,
      singleUpdateMs: 0.07287450000058016,
      bulkUpdateMs: 48.76597900000161,
    },
    tree: {
      bindMs: 318.20829199999935,
      singleUpdateMs: 0.06341649999967558,
      bulkUpdateMs: 41.532687500000065,
    },
  },
];

export const memoryUsageRows: MemoryUsageRow[] = [
  { scenario: 'Parse (1 nodes)', medianHeapMb: 20.7, peakRssMb: 104.5 },
  { scenario: 'Parse (3 nodes)', medianHeapMb: 18.2, peakRssMb: 109.5 },
  { scenario: 'Parse (7 nodes)', medianHeapMb: 18.7, peakRssMb: 110.0 },
  { scenario: 'Parse (15 nodes)', medianHeapMb: 20.6, peakRssMb: 110.9 },
  { scenario: 'Parse (31 nodes)', medianHeapMb: 21.0, peakRssMb: 129.0 },
  { scenario: 'Parse (63 nodes)', medianHeapMb: 25.1, peakRssMb: 133.2 },
  { scenario: 'Bind unique (1,000)', medianHeapMb: 153.2, peakRssMb: 367.8 },
  { scenario: 'Bind same expression (1,000)', medianHeapMb: 366.7, peakRssMb: 608.7 },
  { scenario: 'Single update (1,000)', medianHeapMb: 792.0, peakRssMb: 992.7 },
  { scenario: 'Bulk update (1,000)', medianHeapMb: 805.0, peakRssMb: 1028.1 },
  { scenario: 'Bind unique (3,000)', medianHeapMb: 1051.8, peakRssMb: 1485.4 },
  { scenario: 'Bind same expression (3,000)', medianHeapMb: 1487.5, peakRssMb: 1702.3 },
  { scenario: 'Single update (3,000)', medianHeapMb: 1720.9, peakRssMb: 2374.2 },
  { scenario: 'Bulk update (3,000)', medianHeapMb: 1751.8, peakRssMb: 2391.2 },
  { scenario: 'Bind unique (5,000)', medianHeapMb: 2475.3, peakRssMb: 2739.4 },
  { scenario: 'Bind same expression (5,000)', medianHeapMb: 3596.8, peakRssMb: 2872.2 },
  { scenario: 'Single update (5,000)', medianHeapMb: 3949.8, peakRssMb: 2477.3 },
  { scenario: 'Bulk update (5,000)', medianHeapMb: 3983.2, peakRssMb: 2366.6 },
  { scenario: 'Bind unique (10,000)', medianHeapMb: 4851.6, peakRssMb: 1859.7 },
  { scenario: 'Bind same expression (10,000)', medianHeapMb: 5145.3, peakRssMb: 2527.2 },
  { scenario: 'Single update (10,000)', medianHeapMb: 5920.6, peakRssMb: 2892.9 },
  { scenario: 'Bulk update (10,000)', medianHeapMb: 5959.5, peakRssMb: 2705.5 },
  { scenario: 'Bind+initialize unique (1,000)', medianHeapMb: 432.0, peakRssMb: 722.0 },
  { scenario: 'Bind+initialize same expression (1,000)', medianHeapMb: 668.1, peakRssMb: 867.6 },
  { scenario: 'Bind+initialize unique (3,000)', medianHeapMb: 2220.6, peakRssMb: 2306.7 },
  { scenario: 'Bind+initialize same expression (3,000)', medianHeapMb: 1594.5, peakRssMb: 2316.0 },
  { scenario: 'Bind+initialize unique (5,000)', medianHeapMb: 3467.5, peakRssMb: 2340.6 },
  { scenario: 'Bind+initialize same expression (5,000)', medianHeapMb: 3378.9, peakRssMb: 2296.6 },
  { scenario: 'Bind+initialize unique (10,000)', medianHeapMb: 4604.1, peakRssMb: 2416.9 },
  { scenario: 'Bind+initialize same expression (10,000)', medianHeapMb: 5464.3, peakRssMb: 2708.2 },
  { scenario: 'Identifier-only bind (1,000)', medianHeapMb: 4714.6, peakRssMb: 2832.6 },
  { scenario: 'Identifier-only bind+initialize (1,000)', medianHeapMb: 5040.2, peakRssMb: 3274.8 },
  { scenario: 'Identifier-only single update (1,000)', medianHeapMb: 5173.2, peakRssMb: 3705.7 },
  { scenario: 'Identifier-only bulk update (1,000)', medianHeapMb: 5186.2, peakRssMb: 3691.3 },
  { scenario: 'Identifier-only bind (3,000)', medianHeapMb: 5769.4, peakRssMb: 3528.1 },
  { scenario: 'Identifier-only bind+initialize (3,000)', medianHeapMb: 4888.6, peakRssMb: 3551.0 },
  { scenario: 'Identifier-only single update (3,000)', medianHeapMb: 5152.6, peakRssMb: 3297.3 },
  { scenario: 'Identifier-only bulk update (3,000)', medianHeapMb: 5175.1, peakRssMb: 3222.8 },
  { scenario: 'Identifier-only bind (5,000)', medianHeapMb: 5873.7, peakRssMb: 3095.1 },
  { scenario: 'Identifier-only bind+initialize (5,000)', medianHeapMb: 5912.2, peakRssMb: 3370.8 },
  { scenario: 'Identifier-only single update (5,000)', medianHeapMb: 4696.4, peakRssMb: 2678.9 },
  { scenario: 'Identifier-only bulk update (5,000)', medianHeapMb: 4725.1, peakRssMb: 2944.6 },
  { scenario: 'Identifier-only bind (10,000)', medianHeapMb: 5496.7, peakRssMb: 3042.3 },
  { scenario: 'Identifier-only bind+initialize (10,000)', medianHeapMb: 5863.5, peakRssMb: 2969.7 },
  { scenario: 'Identifier-only single update (10,000)', medianHeapMb: 6481.2, peakRssMb: 2809.4 },
  { scenario: 'Identifier-only bulk update (10,000)', medianHeapMb: 4763.5, peakRssMb: 3118.3 },
];

type ComparisonRow = {
  metric: string;
  unit: 'ms' | 'us/op';
  oldValue: number;
  newValue: number;
  compiledNewValue: number;
  gainPercent: number;
  isNoisy?: boolean;
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
    compiledNewValue: 0.771,
    gainPercent: 0,
  },
  {
    metric: 'Parse 3 nodes',
    unit: 'us/op',
    oldValue: oldRows.parseUsPerOp[1],
    newValue: parsePerformanceRows[1].usPerOperation,
    compiledNewValue: 1.887,
    gainPercent: 0,
  },
  {
    metric: 'Parse 7 nodes',
    unit: 'us/op',
    oldValue: oldRows.parseUsPerOp[2],
    newValue: parsePerformanceRows[2].usPerOperation,
    compiledNewValue: 4.088,
    gainPercent: 0,
  },
  {
    metric: 'Parse 15 nodes',
    unit: 'us/op',
    oldValue: oldRows.parseUsPerOp[3],
    newValue: parsePerformanceRows[3].usPerOperation,
    compiledNewValue: 8.678,
    gainPercent: 0,
  },
  {
    metric: 'Parse 31 nodes',
    unit: 'us/op',
    oldValue: oldRows.parseUsPerOp[4],
    newValue: parsePerformanceRows[4].usPerOperation,
    compiledNewValue: 17.766,
    gainPercent: 0,
  },
  {
    metric: 'Parse 63 nodes',
    unit: 'us/op',
    oldValue: oldRows.parseUsPerOp[5],
    newValue: parsePerformanceRows[5].usPerOperation,
    compiledNewValue: 35.775,
    gainPercent: 0,
  },
  {
    // compiled parseAndClone includes compilation cost; tree parseAndClone is tree-clone cost only
    metric: 'Parse+clone 63 nodes',
    unit: 'us/op',
    oldValue: oldRows.parseAndCloneUsPerOp[5],
    newValue: parseCachePerformanceRows[5].parseAndCloneUsPerOperation,
    compiledNewValue: 199.400,
    gainPercent: 0,
  },
  {
    metric: 'Bind unique 1,000',
    unit: 'ms',
    oldValue: oldRows.bindUniqueMs[0],
    newValue: bindingPerformanceRows[0].bindUniqueMs,
    compiledNewValue: compiledBindingPerformanceRows[0].bindUniqueMs,
    gainPercent: 0,
  },
  {
    metric: 'Bind same 1,000',
    unit: 'ms',
    oldValue: oldRows.bindSameMs[0],
    newValue: bindingPerformanceRows[0].bindSameExpressionMs,
    compiledNewValue: compiledBindingPerformanceRows[0].bindSameExpressionMs,
    gainPercent: 0,
  },
  {
    metric: 'Bind unique 10,000',
    unit: 'ms',
    oldValue: oldRows.bindUniqueMs[3],
    newValue: bindingPerformanceRows[3].bindUniqueMs,
    compiledNewValue: compiledBindingPerformanceRows[3].bindUniqueMs,
    gainPercent: 0,
  },
  {
    metric: 'Bind same 10,000',
    unit: 'ms',
    oldValue: oldRows.bindSameMs[3],
    newValue: bindingPerformanceRows[3].bindSameExpressionMs,
    compiledNewValue: compiledBindingPerformanceRows[3].bindSameExpressionMs,
    gainPercent: 0,
  },
  {
    metric: 'Single update 1,000',
    unit: 'ms',
    oldValue: oldRows.singleUpdateMs[0],
    newValue: updatePerformanceRows[0].singleUpdateMs,
    compiledNewValue: compiledUpdatePerformanceRows[0].singleUpdateMs,
    gainPercent: 0,
    isNoisy: true,
  },
  {
    metric: 'Bulk update 1,000',
    unit: 'ms',
    oldValue: oldRows.bulkUpdateMs[0],
    newValue: updatePerformanceRows[0].bulkUpdateMs,
    compiledNewValue: compiledUpdatePerformanceRows[0].bulkUpdateMs,
    gainPercent: 0,
  },
  {
    metric: 'Single update 10,000',
    unit: 'ms',
    oldValue: oldRows.singleUpdateMs[3],
    newValue: updatePerformanceRows[3].singleUpdateMs,
    compiledNewValue: compiledUpdatePerformanceRows[3].singleUpdateMs,
    gainPercent: 0,
    isNoisy: true,
  },
  {
    metric: 'Bulk update 10,000',
    unit: 'ms',
    oldValue: oldRows.bulkUpdateMs[3],
    newValue: updatePerformanceRows[3].bulkUpdateMs,
    compiledNewValue: compiledUpdatePerformanceRows[3].bulkUpdateMs,
    gainPercent: 0,
  },
];

export const comparisonRows = comparisonRowsBase.map((row) => ({
  ...row,
  gainPercent: ((row.oldValue - row.newValue) / row.oldValue) * 100,
}));

export const topGainsForReleaseNotes = [...comparisonRows]
  .filter((row) => row.gainPercent > 0 && !row.isNoisy)
  .sort((a, b) => b.gainPercent - a.gainPercent);

export const topRegressionsForReleaseNotes = [...comparisonRows]
  .filter((row) => row.gainPercent < 0 && !row.isNoisy)
  .sort((a, b) => a.gainPercent - b.gainPercent);
