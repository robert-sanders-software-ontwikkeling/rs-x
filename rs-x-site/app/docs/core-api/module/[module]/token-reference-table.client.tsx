'use client';

import Link from 'next/link';

import {
  DataTable,
  type IDataTableColumn,
} from '@rs-x/react-components';

export type TokenReferenceTableRow = {
  token: string;
  symbol?: string;
  responsibility: string;
};

type TokenReferenceTableProps = {
  rows: TokenReferenceTableRow[];
};

const columns: IDataTableColumn<TokenReferenceTableRow>[] = [
  {
    id: 'token',
    header: 'Token key',
    accessor: 'token',
    renderCell: (row) => <span className="codeInline">{row.token}</span>,
  },
  {
    id: 'symbol',
    header: 'Service reference',
    accessor: (row) => row.symbol ?? row.token,
    renderCell: (row) =>
      row.symbol ? (
        <Link href={`/docs/core-api/${encodeURIComponent(row.symbol)}`}>
          {row.symbol}
        </Link>
      ) : (
        <span className="codeInline">{row.token}</span>
      ),
  },
  {
    id: 'responsibility',
    header: 'Service responsibility',
    accessor: 'responsibility',
    cellClassName: 'cardText',
  },
];

export function TokenReferenceTable({
  rows,
}: TokenReferenceTableProps) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowKey={(row) => row.token}
      initialSortColumnId="token"
      initialSortDirection="asc"
      enableFilter
      filterLabel="Search"
      hideFilterLabel
      filterPlaceholder="Search token keys and services"
      emptyMessage="No token rows match your search."
      controlsClassName="comparisonSearchRow"
      filterLabelClassName="comparisonSearchLabel"
      filterInputClassName="comparisonSearchInput"
      tableWrapClassName="coreTokenTableWrap"
      tableClassName="coreTokenTable"
      sortButtonClassName="comparisonSortButton"
      sortMarkerClassName="comparisonSortMarker"
    />
  );
}
