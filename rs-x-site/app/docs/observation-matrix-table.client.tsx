'use client';

import Link from 'next/link';

import {
  DataTable,
  type IDataTableColumn,
} from '@rs-x/react-components';

export type ObservationMatrixRow = {
  valueType: string;
  href: string;
  mechanism: string;
  isAsync: boolean;
  detection: string;
};

type ObservationMatrixTableProps = {
  rows: ObservationMatrixRow[];
};

const columns: IDataTableColumn<ObservationMatrixRow>[] = [
  {
    id: 'valueType',
    header: 'Value type',
    accessor: 'valueType',
    renderCell: (row) => <Link href={row.href}>{row.valueType}</Link>,
  },
  {
    id: 'mechanism',
    header: 'Mechanism',
    accessor: 'mechanism',
  },
  {
    id: 'isAsync',
    header: 'Async',
    accessor: (row) => (row.isAsync ? 'True' : 'False'),
    sortAccessor: (row) => row.isAsync,
    filterAccessor: (row) => (row.isAsync ? 'true async' : 'false sync'),
    renderCell: (row) => (
      <span
        className={`observationAsyncBadge ${row.isAsync ? 'isAsync' : 'isSync'}`}
        aria-label={row.isAsync ? 'Async: true' : 'Async: false'}
      >
        <span className="observationAsyncBadgeIcon" aria-hidden="true">
          {row.isAsync ? '✓' : '✕'}
        </span>
        <span>{row.isAsync ? 'True' : 'False'}</span>
      </span>
    ),
  },
  {
    id: 'detection',
    header: 'How change is detected',
    accessor: 'detection',
  },
];

export function ObservationMatrixTable({
  rows,
}: ObservationMatrixTableProps) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowKey={(row) => row.valueType}
      initialSortColumnId="valueType"
      initialSortDirection="asc"
      enableFilter={false}
      controlsClassName="comparisonSearchRow"
      filterLabelClassName="comparisonSearchLabel"
      filterInputClassName="comparisonSearchInput"
      tableWrapClassName="comparisonWrap advancedMatrixWrap"
      tableClassName="comparisonTable"
      sortButtonClassName="comparisonSortButton"
      sortMarkerClassName="comparisonSortMarker"
    />
  );
}
