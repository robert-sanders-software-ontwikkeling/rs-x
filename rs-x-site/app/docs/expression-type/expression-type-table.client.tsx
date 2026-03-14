'use client';

import {
  DataTable,
  type IDataTableColumn,
} from '@rs-x/react-components';

export type ExpressionTypeTableRow = {
  name: string;
  description: string;
  example: string;
};

type ExpressionTypeTableProps = {
  rows: ExpressionTypeTableRow[];
};

const columns: IDataTableColumn<ExpressionTypeTableRow>[] = [
  {
    id: 'name',
    header: 'ExpressionType',
    accessor: 'name',
    renderCell: (row) => <span className="codeInline">{row.name}</span>,
  },
  {
    id: 'description',
    header: 'Description',
    accessor: 'description',
  },
  {
    id: 'example',
    header: 'Example',
    accessor: 'example',
    renderCell: (row) => <span className="codeInline">{row.example}</span>,
  },
];

export function ExpressionTypeTable({
  rows,
}: ExpressionTypeTableProps) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowKey={(row) => row.name}
      initialSortColumnId="name"
      initialSortDirection="asc"
      enableFilter
      filterLabel="Search"
      hideFilterLabel
      filterPlaceholder="Search expression types"
      emptyMessage="No expression types match your search."
      controlsClassName="comparisonSearchRow"
      filterLabelClassName="comparisonSearchLabel"
      filterInputClassName="comparisonSearchInput"
      tableWrapClassName="comparisonWrap"
      tableClassName="comparisonTable"
      sortButtonClassName="comparisonSortButton"
      sortMarkerClassName="comparisonSortMarker"
    />
  );
}
