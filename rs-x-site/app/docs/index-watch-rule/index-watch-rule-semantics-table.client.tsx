'use client';

import {
  DataTable,
  type IDataTableColumn,
} from '@rs-x/react-components';

export type RuleSemanticsTableRow = {
  valueType: string;
  indexMeaning: string;
  targetMeaning: string;
  typicalRuleCheck: string;
};

type RuleSemanticsTableProps = {
  rows: RuleSemanticsTableRow[];
};

const columns: IDataTableColumn<RuleSemanticsTableRow>[] = [
  {
    id: 'valueType',
    header: 'Value Type',
    accessor: 'valueType',
  },
  {
    id: 'indexMeaning',
    header: 'index means',
    accessor: 'indexMeaning',
  },
  {
    id: 'targetMeaning',
    header: 'target means',
    accessor: 'targetMeaning',
  },
  {
    id: 'typicalRuleCheck',
    header: 'Typical check',
    accessor: 'typicalRuleCheck',
    renderCell: (row) => (
      <span className="codeInline">{row.typicalRuleCheck}</span>
    ),
  },
];

export function IndexWatchRuleSemanticsTable({
  rows,
}: RuleSemanticsTableProps) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowKey={(row) => row.valueType}
      initialSortColumnId="valueType"
      initialSortDirection="asc"
      enableFilter
      filterLabel="Search"
      hideFilterLabel
      filterPlaceholder="Search value semantics"
      emptyMessage="No semantics rows match your search."
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
