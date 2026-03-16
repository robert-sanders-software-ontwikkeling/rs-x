'use client';

import {
  DataTable,
  type IDataTableColumn,
} from '@rs-x/react-components';

export type ParsePerformanceRow = {
  nodeCount: number;
  expressionShape: string;
  medianMs: number;
  usPerOperation: number;
  opsPerSecond: number;
};

export type ParseCachePerformanceRow = {
  nodeCount: number;
  parseAndCloneMs: number;
  parseAndCloneUsPerOperation: number;
  cloneOnlyMs: number;
  cloneOnlyUsPerOperation: number;
};

export type BindingPerformanceRow = {
  bindings: number;
  bindUniqueMs: number;
  bindSameExpressionMs: number;
};

export type UpdatePerformanceRow = {
  bindings: number;
  singleUpdateMs: number;
  bulkUpdateMs: number;
};

export type MemoryUsageRow = {
  scenario: string;
  medianHeapMb: number;
  peakRssMb: number;
};

type ParsePerformanceTableProps = {
  rows: ParsePerformanceRow[];
};

type ParseCachePerformanceTableProps = {
  rows: ParseCachePerformanceRow[];
};

type BindingPerformanceTableProps = {
  rows: BindingPerformanceRow[];
};

type UpdatePerformanceTableProps = {
  rows: UpdatePerformanceRow[];
};

type MemoryUsageTableProps = {
  rows: MemoryUsageRow[];
};

const parseColumns: IDataTableColumn<ParsePerformanceRow>[] = [
  {
    id: 'nodeCount',
    header: 'Nodes',
    accessor: 'nodeCount',
    renderCell: (row) => row.nodeCount.toLocaleString(),
  },
  {
    id: 'expressionShape',
    header: 'Expression shape',
    accessor: 'expressionShape',
    renderCell: (row) => <span className="codeInline">{row.expressionShape}</span>,
    sortable: false,
  },
  {
    id: 'medianMs',
    header: 'Median (ms)',
    accessor: 'medianMs',
    renderCell: (row) => row.medianMs.toFixed(3),
  },
  {
    id: 'usPerOperation',
    header: 'us/op',
    accessor: 'usPerOperation',
    renderCell: (row) => row.usPerOperation.toFixed(2),
  },
  {
    id: 'opsPerSecond',
    header: 'ops/s',
    accessor: 'opsPerSecond',
    renderCell: (row) => Math.round(row.opsPerSecond).toLocaleString(),
  },
];

const bindingColumns: IDataTableColumn<BindingPerformanceRow>[] = [
  {
    id: 'bindings',
    header: 'Bindings',
    accessor: 'bindings',
    renderCell: (row) => row.bindings.toLocaleString(),
  },
  {
    id: 'bindUniqueMs',
    header: 'Bind unique median (ms)',
    accessor: 'bindUniqueMs',
    renderCell: (row) => row.bindUniqueMs.toFixed(3),
  },
  {
    id: 'bindSameExpressionMs',
    header: 'Bind same-expression median (ms)',
    accessor: 'bindSameExpressionMs',
    renderCell: (row) => row.bindSameExpressionMs.toFixed(3),
  },
];

const parseCacheColumns: IDataTableColumn<ParseCachePerformanceRow>[] = [
  {
    id: 'nodeCount',
    header: 'Nodes',
    accessor: 'nodeCount',
    renderCell: (row) => row.nodeCount.toLocaleString(),
  },
  {
    id: 'parseAndCloneMs',
    header: 'Parse+clone median (ms)',
    accessor: 'parseAndCloneMs',
    renderCell: (row) => row.parseAndCloneMs.toFixed(3),
  },
  {
    id: 'parseAndCloneUsPerOperation',
    header: 'Parse+clone us/op',
    accessor: 'parseAndCloneUsPerOperation',
    renderCell: (row) => row.parseAndCloneUsPerOperation.toFixed(2),
  },
  {
    id: 'cloneOnlyMs',
    header: 'Clone-only median (ms)',
    accessor: 'cloneOnlyMs',
    renderCell: (row) => row.cloneOnlyMs.toFixed(3),
  },
  {
    id: 'cloneOnlyUsPerOperation',
    header: 'Clone-only us/op',
    accessor: 'cloneOnlyUsPerOperation',
    renderCell: (row) => row.cloneOnlyUsPerOperation.toFixed(2),
  },
];

const updateColumns: IDataTableColumn<UpdatePerformanceRow>[] = [
  {
    id: 'bindings',
    header: 'Bindings',
    accessor: 'bindings',
    renderCell: (row) => row.bindings.toLocaleString(),
  },
  {
    id: 'singleUpdateMs',
    header: 'Single update median (ms)',
    accessor: 'singleUpdateMs',
    renderCell: (row) => row.singleUpdateMs.toFixed(3),
  },
  {
    id: 'bulkUpdateMs',
    header: 'Bulk update median (ms)',
    accessor: 'bulkUpdateMs',
    renderCell: (row) => row.bulkUpdateMs.toFixed(3),
  },
];

const memoryColumns: IDataTableColumn<MemoryUsageRow>[] = [
  {
    id: 'scenario',
    header: 'Scenario',
    accessor: 'scenario',
    sortable: false,
  },
  {
    id: 'medianHeapMb',
    header: 'Median heap after run (MB)',
    accessor: 'medianHeapMb',
    renderCell: (row) => row.medianHeapMb.toFixed(1),
  },
  {
    id: 'peakRssMb',
    header: 'Peak RSS after run (MB)',
    accessor: 'peakRssMb',
    renderCell: (row) => row.peakRssMb.toFixed(1),
  },
];

export function ParsePerformanceTable({ rows }: ParsePerformanceTableProps) {
  return (
    <DataTable
      rows={rows}
      columns={parseColumns}
      getRowKey={(row) => row.nodeCount}
      initialSortColumnId="nodeCount"
      initialSortDirection="asc"
      enableFilter={false}
      controlsClassName="comparisonSearchRow"
      filterInputClassName="comparisonSearchInput"
      tableWrapClassName="comparisonWrap"
      tableClassName="comparisonTable"
      sortButtonClassName="comparisonSortButton"
      sortMarkerClassName="comparisonSortMarker"
    />
  );
}

export function BindingPerformanceTable({
  rows,
}: BindingPerformanceTableProps) {
  return (
    <DataTable
      rows={rows}
      columns={bindingColumns}
      getRowKey={(row) => row.bindings}
      initialSortColumnId="bindings"
      initialSortDirection="asc"
      enableFilter={false}
      controlsClassName="comparisonSearchRow"
      filterInputClassName="comparisonSearchInput"
      tableWrapClassName="comparisonWrap"
      tableClassName="comparisonTable"
      sortButtonClassName="comparisonSortButton"
      sortMarkerClassName="comparisonSortMarker"
    />
  );
}

export function ParseCachePerformanceTable({
  rows,
}: ParseCachePerformanceTableProps) {
  return (
    <DataTable
      rows={rows}
      columns={parseCacheColumns}
      getRowKey={(row) => row.nodeCount}
      initialSortColumnId="nodeCount"
      initialSortDirection="asc"
      enableFilter={false}
      controlsClassName="comparisonSearchRow"
      filterInputClassName="comparisonSearchInput"
      tableWrapClassName="comparisonWrap"
      tableClassName="comparisonTable"
      sortButtonClassName="comparisonSortButton"
      sortMarkerClassName="comparisonSortMarker"
    />
  );
}

export function UpdatePerformanceTable({ rows }: UpdatePerformanceTableProps) {
  return (
    <DataTable
      rows={rows}
      columns={updateColumns}
      getRowKey={(row) => row.bindings}
      initialSortColumnId="bindings"
      initialSortDirection="asc"
      enableFilter={false}
      controlsClassName="comparisonSearchRow"
      filterInputClassName="comparisonSearchInput"
      tableWrapClassName="comparisonWrap"
      tableClassName="comparisonTable"
      sortButtonClassName="comparisonSortButton"
      sortMarkerClassName="comparisonSortMarker"
    />
  );
}

export function MemoryUsageTable({ rows }: MemoryUsageTableProps) {
  return (
    <DataTable
      rows={rows}
      columns={memoryColumns}
      getRowKey={(row) => row.scenario}
      initialSortColumnId="scenario"
      initialSortDirection="asc"
      enableFilter={false}
      controlsClassName="comparisonSearchRow"
      filterInputClassName="comparisonSearchInput"
      tableWrapClassName="comparisonWrap"
      tableClassName="comparisonTable"
      sortButtonClassName="comparisonSortButton"
      sortMarkerClassName="comparisonSortMarker"
    />
  );
}
