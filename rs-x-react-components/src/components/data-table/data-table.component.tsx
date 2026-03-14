'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';

import './data-table.component.css';

type SortDirection = 'asc' | 'desc';
type Accessor<TData> = keyof TData | ((row: TData) => unknown);

export interface IDataTableColumn<TData> {
  id: string;
  header: React.ReactNode;
  accessor?: Accessor<TData>;
  renderCell?: (row: TData) => React.ReactNode;
  sortAccessor?: (row: TData) => unknown;
  filterAccessor?: (row: TData) => unknown;
  sortable?: boolean;
  searchable?: boolean;
  headerClassName?: string;
  cellClassName?: string;
}

export interface IDataTableProps<TData> {
  rows: readonly TData[];
  columns: readonly IDataTableColumn<TData>[];
  getRowKey: (row: TData, index: number) => React.Key;
  initialSortColumnId?: string;
  initialSortDirection?: SortDirection;
  enableFilter?: boolean;
  filterLabel?: string;
  filterPlaceholder?: string;
  hideFilterLabel?: boolean;
  emptyMessage?: React.ReactNode;
  className?: string;
  controlsClassName?: string;
  filterLabelClassName?: string;
  filterInputClassName?: string;
  tableWrapClassName?: string;
  tableClassName?: string;
  sortButtonClassName?: string;
  sortMarkerClassName?: string;
  showInactiveSortMarker?: boolean;
}

function joinClassNames(
  classes: Array<string | undefined | false>,
): string | undefined {
  const joined = classes.filter(Boolean).join(' ');
  return joined.length > 0 ? joined : undefined;
}

function isSortDirection(value: string): value is SortDirection {
  return value === 'asc' || value === 'desc';
}

function resolveAccessorValue<TData>(
  row: TData,
  accessor: Accessor<TData> | undefined,
): unknown {
  if (!accessor) {
    return undefined;
  }

  if (typeof accessor === 'function') {
    return accessor(row);
  }

  return row[accessor];
}

function normalizeSearchText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).toLocaleLowerCase();
}

function compareValues(left: unknown, right: unknown): number {
  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime();
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return Number(left) - Number(right);
  }

  return String(left ?? '').localeCompare(String(right ?? ''), undefined, {
    sensitivity: 'base',
    numeric: true,
  });
}

function isColumnSortable<TData>(column: IDataTableColumn<TData>): boolean {
  if (column.sortable !== undefined) {
    return column.sortable;
  }

  return !!(column.sortAccessor || column.accessor);
}

export const DataTable = <TData,>({
  rows,
  columns,
  getRowKey,
  initialSortColumnId,
  initialSortDirection = 'asc',
  enableFilter = true,
  filterLabel = 'Search',
  filterPlaceholder = 'Search table',
  hideFilterLabel = false,
  emptyMessage = 'No rows match your search.',
  className,
  controlsClassName,
  filterLabelClassName,
  filterInputClassName,
  tableWrapClassName,
  tableClassName,
  sortButtonClassName,
  sortMarkerClassName,
  showInactiveSortMarker = false,
}: IDataTableProps<TData>): React.ReactElement => {
  const firstSortableColumnId = useMemo(() => {
    return columns.find((column) => isColumnSortable(column))?.id;
  }, [columns]);

  const fallbackSortColumnId = useMemo(() => {
    if (
      initialSortColumnId &&
      columns.some(
        (column) =>
          column.id === initialSortColumnId && isColumnSortable(column),
      )
    ) {
      return initialSortColumnId;
    }

    return firstSortableColumnId;
  }, [columns, firstSortableColumnId, initialSortColumnId]);

  const [query, setQuery] = useState('');
  const searchInputId = useId();
  const [sortColumnId, setSortColumnId] = useState<string | undefined>(
    fallbackSortColumnId,
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    isSortDirection(initialSortDirection) ? initialSortDirection : 'asc',
  );

  useEffect(() => {
    if (
      sortColumnId &&
      columns.some(
        (column) => column.id === sortColumnId && isColumnSortable(column),
      )
    ) {
      return;
    }

    setSortColumnId(fallbackSortColumnId);
    setSortDirection(initialSortDirection);
  }, [columns, fallbackSortColumnId, initialSortDirection, sortColumnId]);

  const normalizedQuery = useMemo(
    () => query.trim().toLocaleLowerCase(),
    [query],
  );

  const filteredRows = useMemo(() => {
    if (!enableFilter || normalizedQuery.length === 0) {
      return rows;
    }

    return rows.filter((row) => {
      return columns.some((column) => {
        if (column.searchable === false) {
          return false;
        }

        const filterValue =
          column.filterAccessor?.(row) ??
          column.sortAccessor?.(row) ??
          resolveAccessorValue(row, column.accessor);
        const normalizedValue = normalizeSearchText(filterValue);
        return normalizedValue.includes(normalizedQuery);
      });
    });
  }, [columns, enableFilter, normalizedQuery, rows]);

  const sortedRows = useMemo(() => {
    if (!sortColumnId) {
      return filteredRows;
    }

    const sortColumn = columns.find((column) => column.id === sortColumnId);
    if (!sortColumn || !isColumnSortable(sortColumn)) {
      return filteredRows;
    }

    const directionFactor = sortDirection === 'asc' ? 1 : -1;
    const indexedRows = filteredRows.map((row, index) => ({ row, index }));

    indexedRows.sort((left, right) => {
      const leftValue =
        sortColumn.sortAccessor?.(left.row) ??
        resolveAccessorValue(left.row, sortColumn.accessor);
      const rightValue =
        sortColumn.sortAccessor?.(right.row) ??
        resolveAccessorValue(right.row, sortColumn.accessor);
      const comparison = compareValues(leftValue, rightValue);
      if (comparison !== 0) {
        return comparison * directionFactor;
      }

      return left.index - right.index;
    });

    return indexedRows.map((entry) => entry.row);
  }, [columns, filteredRows, sortColumnId, sortDirection]);

  const onSort = (columnId: string): void => {
    if (sortColumnId === columnId) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortColumnId(columnId);
    setSortDirection('asc');
  };

  return (
    <div className={joinClassNames(['rsxDataTable', className])}>
      {enableFilter ? (
        <div
          className={joinClassNames([
            'rsxDataTableControls',
            controlsClassName,
          ])}
        >
          <label
            htmlFor={searchInputId}
            className={joinClassNames([
              'rsxDataTableFilterLabel',
              hideFilterLabel && 'rsxDataTableFilterLabelSrOnly',
              filterLabelClassName,
            ])}
          >
            {filterLabel}
          </label>
          <input
            id={searchInputId}
            type="search"
            value={query}
            className={joinClassNames([
              'rsxDataTableFilterInput',
              filterInputClassName,
            ])}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder={filterPlaceholder}
            autoComplete="off"
          />
        </div>
      ) : null}

      <div className={joinClassNames(['rsxDataTableWrap', tableWrapClassName])}>
        <table className={joinClassNames(['rsxDataTableTable', tableClassName])}>
          <thead>
            <tr>
              {columns.map((column) => {
                const sortable = isColumnSortable(column);
                const isActiveSort = sortable && column.id === sortColumnId;
                const marker = !sortable
                  ? ''
                  : !isActiveSort
                    ? showInactiveSortMarker
                      ? '↕'
                      : ''
                    : sortDirection === 'asc'
                      ? '↑'
                      : '↓';

                return (
                  <th
                    key={column.id}
                    className={column.headerClassName}
                    aria-sort={
                      sortable
                        ? isActiveSort
                          ? sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                        : undefined
                    }
                  >
                    {sortable ? (
                      <button
                        type="button"
                        className={joinClassNames([
                          'rsxDataTableSortButton',
                          isActiveSort && 'isActive',
                          sortButtonClassName,
                        ])}
                        onClick={() => {
                          onSort(column.id);
                        }}
                      >
                        <span>{column.header}</span>
                        <span
                          className={joinClassNames([
                            'rsxDataTableSortMarker',
                            sortMarkerClassName,
                          ])}
                        >
                          {marker}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td
                  className="rsxDataTableEmptyCell"
                  colSpan={Math.max(columns.length, 1)}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedRows.map((row, index) => (
                <tr key={getRowKey(row, index)}>
                  {columns.map((column) => {
                    const value = resolveAccessorValue(row, column.accessor);
                    return (
                      <td key={column.id} className={column.cellClassName}>
                        {column.renderCell
                          ? column.renderCell(row)
                          : String(value ?? '')}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
