'use client';

import {
  DataTable,
  type IDataTableColumn,
} from '@rs-x/react-components';

export type ExpressionTypeRow = {
  name: string;
  category: string;
  syntax: string;
  description: string;
};

type ExpressionTypesTableProps = {
  rows: ExpressionTypeRow[];
};

const columns: IDataTableColumn<ExpressionTypeRow>[] = [
  {
    id: 'name',
    header: 'ExpressionType',
    accessor: 'name',
    renderCell: (row) => <span className="codeInline">{row.name}</span>,
  },
  {
    id: 'category',
    header: 'Category',
    accessor: 'category',
  },
  {
    id: 'syntax',
    header: 'Typical syntax',
    accessor: 'syntax',
    renderCell: (row) => <span className="codeInline">{row.syntax}</span>,
  },
  {
    id: 'description',
    header: 'Description',
    accessor: 'description',
  },
];

export function ExpressionTypesTable({ rows }: ExpressionTypesTableProps) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowKey={(row) => `${row.name}-${row.category}`}
      initialSortColumnId="name"
      initialSortDirection="asc"
      enableFilter
      filterLabel="Search"
      hideFilterLabel
      filterPlaceholder="Filter expression types and categories"
      emptyMessage="No expression types match your search."
      className="expressionTypesDataTable"
      controlsClassName="expressionTypesSearchRow"
      filterInputClassName="expressionTypesSearchInput"
      tableWrapClassName="expressionTypesTableWrap"
      tableClassName="expressionTypesTable"
      sortButtonClassName="expressionTypesSortButton"
      sortMarkerClassName="expressionTypesSortMarker"
    />
  );
}
