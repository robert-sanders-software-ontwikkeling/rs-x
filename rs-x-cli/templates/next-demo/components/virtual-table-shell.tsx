'use client';

import { type FC } from 'react';

import { useVirtualTableController } from '@/hooks/use-virtual-table-controller';
import { useVirtualTableViewport } from '@/hooks/use-virtual-table-viewport';

import { VirtualTableRow } from './virtual-table-row';

export const VirtualTableShell: FC = () => {
  const { controller, snapshot } = useVirtualTableController();
  const viewportRef = useVirtualTableViewport(controller);

  return (
    <>
      <section className="table-toolbar">
        <div className="toolbar-left">
          <h2>Inventory Snapshot</h2>
          <p>
            {snapshot.totalRows} rows • {snapshot.poolSize} pre-wired models
          </p>
        </div>
        <div className="toolbar-right">
          <button
            type="button"
            onClick={() => {
              controller.toggleSort('price');
            }}
          >
            Sort by price
          </button>
          <button
            type="button"
            onClick={() => {
              controller.toggleSort('quantity');
            }}
          >
            Sort by stock
          </button>
          <button
            type="button"
            onClick={() => {
              controller.toggleSort('name');
            }}
          >
            Sort by name
          </button>
        </div>
      </section>

      <div className="table-header">
        <span>ID</span>
        <span>Name</span>
        <span>Category</span>
        <span>Price</span>
        <span>Qty</span>
        <span>Total</span>
        <span>Updated</span>
      </div>

      <div
        ref={viewportRef}
        className="table-viewport"
        onScroll={(event) => {
          controller.setScrollTop(event.currentTarget.scrollTop);
        }}
      >
        <div
          className="table-spacer"
          style={{ height: `${snapshot.spacerHeight}px` }}
        />
        {snapshot.visibleRows.map((item) => (
          <VirtualTableRow key={item.index} item={item} />
        ))}
      </div>

      <div className="table-footer">
        <div>
          Rows in view: {snapshot.rowsInView} • Loaded pages:{' '}
          {snapshot.loadedPageCount}
        </div>
        <div>Scroll to stream pages from a 1,000,000-row virtual dataset.</div>
      </div>
    </>
  );
};
