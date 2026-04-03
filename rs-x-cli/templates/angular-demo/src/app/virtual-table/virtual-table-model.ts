import { type IExpression,rsx } from '@rs-x/expression-parser';

import { type RowData, type SortDirection, type SortKey } from './row-data';
import { createRowModel, type RowModel,updateRowModel } from './row-model';
import { VirtualTableDataService } from './virtual-table-data.service';

export type RowView = {
  index: number;
  top: number;
  row: RowModel;
};

const ROW_HEIGHT = 36;
const PAGE_SIZE = 50;
const POOL_PAGES = 4;
const CACHE_PADDING_PAGES = 2;
const RETAIN_PADDING_PAGES = 4;

export class VirtualTableModel {
  public rowHeight = ROW_HEIGHT;
  public readonly pageSize = PAGE_SIZE;
  public readonly poolSize = PAGE_SIZE * POOL_PAGES;
  public readonly totalRows: number;

  public scrollTop = 0;
  public viewportHeight = 480;
  public sortKey: SortKey = 'id';
  public sortDirection: SortDirection = 'asc';
  public spacerHeight: number;
  public rowsInView = Math.max(
    1,
    Math.ceil(this.viewportHeight / this.rowHeight),
  );
  public visibleRows: RowView[] = [];
  public readonly rowsExpression: IExpression<RowView[]>;

  private readonly rowsModel = {
    rows: [] as RowView[],
  };
  private readonly pool = Array.from({ length: this.poolSize }, () =>
    createRowModel(),
  );
  private readonly dataByIndex = new Map<number, RowData>();
  private readonly loadedPages = new Set<number>();
  private readonly pageLoading = new Map<number, Promise<void>>();
  private readonly dataService = new VirtualTableDataService();

  public constructor() {
    this.totalRows = this.dataService.totalRows;
    this.spacerHeight = this.totalRows * this.rowHeight;
    this.rowsExpression = rsx<RowView[]>('rows')(this.rowsModel);
    this.refresh();
  }

  public get loadedPageCount(): number {
    return this.loadedPages.size;
  }

  public setViewportHeight(height: number): void {
    this.viewportHeight = height;
    this.rowsInView = Math.max(
      1,
      Math.ceil(this.viewportHeight / this.rowHeight),
    );
    this.refresh();
  }

  public setRowHeight(height: number): void {
    if (this.rowHeight === height) {
      return;
    }

    this.rowHeight = height;
    this.spacerHeight = this.totalRows * this.rowHeight;
    this.rowsInView = Math.max(
      1,
      Math.ceil(this.viewportHeight / this.rowHeight),
    );
    this.refresh();
  }

  public setScrollTop(value: number): void {
    this.scrollTop = value;
    this.refresh();
  }

  public toggleSort(nextKey: SortKey): void {
    if (this.sortKey === nextKey) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = nextKey;
      this.sortDirection = 'asc';
    }

    this.resetLoadedData();
    this.refresh();
  }

  private refresh(): void {
    const scrollIndex = Math.floor(this.scrollTop / this.rowHeight);
    const bufferTop = Math.max(
      0,
      Math.floor((this.poolSize - this.rowsInView) / 2),
    );
    const maxStart = Math.max(0, this.totalRows - this.poolSize);
    const startIndex = Math.min(Math.max(scrollIndex - bufferTop, 0), maxStart);
    const endIndex = Math.min(startIndex + this.poolSize, this.totalRows);
    const startPage = Math.max(
      0,
      Math.floor(startIndex / this.pageSize) - CACHE_PADDING_PAGES,
    );
    const endPage = Math.min(
      Math.floor((endIndex - 1) / this.pageSize) + CACHE_PADDING_PAGES,
      Math.floor((this.totalRows - 1) / this.pageSize),
    );

    this.ensurePages(startPage, endPage);
    this.pruneCachedPages(startPage, endPage);

    const nextRows: RowView[] = [];
    const length = endIndex - startIndex;

    for (let offset = 0; offset < length; offset += 1) {
      const index = startIndex + offset;
      const target = this.pool[offset];
      updateRowModel(target, this.getRowData(index));

      nextRows.push({
        index,
        top: index * this.rowHeight,
        row: target,
      });
    }

    this.rowsModel.rows = nextRows;
    this.visibleRows = nextRows;
  }

  private ensurePages(startPage: number, endPage: number): void {
    for (let pageIndex = startPage; pageIndex <= endPage; pageIndex += 1) {
      this.ensurePageLoaded(pageIndex);
    }
  }

  private ensurePageLoaded(pageIndex: number): void {
    if (this.loadedPages.has(pageIndex) || this.pageLoading.has(pageIndex)) {
      return;
    }

    const task = this.loadPageAsync(pageIndex).finally(() => {
      this.pageLoading.delete(pageIndex);
      this.loadedPages.add(pageIndex);
      this.refresh();
    });

    this.pageLoading.set(pageIndex, task);
  }

  private async loadPageAsync(pageIndex: number): Promise<void> {
    const page = await this.dataService.fetchPage(
      pageIndex,
      this.pageSize,
      this.sortKey,
      this.sortDirection,
    );
    const startIndex = pageIndex * this.pageSize;

    for (let offset = 0; offset < page.items.length; offset += 1) {
      const item = page.items[offset];
      if (!item) {
        continue;
      }

      this.dataByIndex.set(startIndex + offset, item);
    }
  }

  private getRowData(index: number): RowData {
    const cached = this.dataByIndex.get(index);
    if (cached) {
      return cached;
    }

    return this.buildPlaceholderRow(index);
  }

  private buildPlaceholderRow(index: number): RowData {
    return {
      id: index + 1,
      name: 'Loading...',
      price: 0,
      quantity: 0,
      category: 'Pending',
      updatedAt: '--',
    };
  }

  private resetLoadedData(): void {
    this.dataByIndex.clear();
    this.loadedPages.clear();
    this.pageLoading.clear();
  }

  private pruneCachedPages(startPage: number, endPage: number): void {
    const minPage = Math.max(0, startPage - RETAIN_PADDING_PAGES);
    const maxPage = Math.min(
      Math.floor((this.totalRows - 1) / this.pageSize),
      endPage + RETAIN_PADDING_PAGES,
    );

    for (const pageIndex of Array.from(this.loadedPages)) {
      if (pageIndex >= minPage && pageIndex <= maxPage) {
        continue;
      }

      this.loadedPages.delete(pageIndex);
      const pageStart = pageIndex * this.pageSize;
      const pageEnd = Math.min(pageStart + this.pageSize, this.totalRows);
      for (let index = pageStart; index < pageEnd; index += 1) {
        this.dataByIndex.delete(index);
      }
    }
  }
}
