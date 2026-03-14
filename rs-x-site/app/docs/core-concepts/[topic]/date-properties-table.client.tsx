'use client';

import {
  DataTable,
  type IDataTableColumn,
} from '@rs-x/react-components';

export type DatePropertyTableRow = {
  property: string;
  scope: string;
  getter: string;
  setter: string;
  expression: string;
  notes: string;
};

type DatePropertiesTableProps = {
  rows: DatePropertyTableRow[];
};

const columns: IDataTableColumn<DatePropertyTableRow>[] = [
  {
    id: 'property',
    header: 'Property key',
    accessor: 'property',
    renderCell: (row) => <span className="codeInline">{row.property}</span>,
  },
  {
    id: 'scope',
    header: 'Scope',
    accessor: 'scope',
  },
  {
    id: 'getter',
    header: 'Maps to getter',
    accessor: 'getter',
    renderCell: (row) => <span className="codeInline">{row.getter}</span>,
  },
  {
    id: 'setter',
    header: 'Maps to setter',
    accessor: 'setter',
    renderCell: (row) => <span className="codeInline">{row.setter}</span>,
  },
  {
    id: 'expression',
    header: 'Expression usage',
    accessor: 'expression',
    renderCell: (row) => <span className="codeInline">{row.expression}</span>,
  },
  {
    id: 'notes',
    header: 'Notes',
    accessor: 'notes',
  },
];

export function DatePropertiesTable({ rows }: DatePropertiesTableProps) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowKey={(row) => row.property}
      initialSortColumnId="property"
      initialSortDirection="asc"
      enableFilter
      filterLabel="Search"
      hideFilterLabel
      filterPlaceholder="Search date keys, methods, and notes"
      emptyMessage="No date properties match your search."
      controlsClassName="comparisonSearchRow"
      filterInputClassName="comparisonSearchInput"
      tableWrapClassName="comparisonWrap"
      tableClassName="comparisonTable"
      sortButtonClassName="comparisonSortButton"
      sortMarkerClassName="comparisonSortMarker"
    />
  );
}
