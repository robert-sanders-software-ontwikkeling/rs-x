import {
  createRowData,
  type RowData,
  type SortDirection,
  type SortKey,
} from './row-data';

export type VirtualTablePage = {
  total: number;
  items: RowData[];
};

const TOTAL_ROWS = 1_000_000;
const REQUEST_DELAY_MS = 120;
const CATEGORY_COUNT = 4;
const PRICE_BUCKET_COUNT = 1_000;
const QUANTITY_BUCKET_COUNT = 100;
const MAX_CACHED_PAGES = 24;

export class VirtualTableDataService {
  private readonly pageCache = new Map<string, VirtualTablePage>();

  public get totalRows(): number {
    return TOTAL_ROWS;
  }

  public async fetchPage(
    pageIndex: number,
    pageSize: number,
    sortKey: SortKey,
    sortDirection: SortDirection,
  ): Promise<VirtualTablePage> {
    const cacheKey = `${sortKey}:${sortDirection}:${pageIndex}:${pageSize}`;
    const cached = this.pageCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    await this.delay(REQUEST_DELAY_MS + (pageIndex % 5) * 35);

    const startIndex = pageIndex * pageSize;
    const items: RowData[] = [];
    const endIndex = Math.min(startIndex + pageSize, TOTAL_ROWS);

    for (
      let visualIndex = startIndex;
      visualIndex < endIndex;
      visualIndex += 1
    ) {
      const id = this.getIdAtVisualIndex(visualIndex, sortKey, sortDirection);
      items.push(createRowData(id));
    }

    const page = { total: TOTAL_ROWS, items };
    this.pageCache.set(cacheKey, page);
    this.trimCache();
    return page;
  }

  private getIdAtVisualIndex(
    visualIndex: number,
    sortKey: SortKey,
    sortDirection: SortDirection,
  ): number {
    const normalizedIndex =
      sortDirection === 'asc' ? visualIndex : TOTAL_ROWS - 1 - visualIndex;

    if (sortKey === 'price') {
      return this.getPriceSortedId(normalizedIndex);
    }

    if (sortKey === 'quantity') {
      return this.getQuantitySortedId(normalizedIndex);
    }

    if (sortKey === 'category') {
      return this.getCategorySortedId(normalizedIndex);
    }

    return normalizedIndex + 1;
  }

  private getPriceSortedId(visualIndex: number): number {
    const groupSize = TOTAL_ROWS / PRICE_BUCKET_COUNT;
    const priceBucket = Math.floor(visualIndex / groupSize);
    const offsetInBucket = visualIndex % groupSize;

    return priceBucket + offsetInBucket * PRICE_BUCKET_COUNT + 1;
  }

  private getQuantitySortedId(visualIndex: number): number {
    const groupSize = TOTAL_ROWS / QUANTITY_BUCKET_COUNT;
    const quantityBucket = Math.floor(visualIndex / groupSize);
    const offsetInBucket = visualIndex % groupSize;
    const quantityStride = PRICE_BUCKET_COUNT * QUANTITY_BUCKET_COUNT;
    const quantityBlock = Math.floor(offsetInBucket / PRICE_BUCKET_COUNT);
    const priceBucket = offsetInBucket % PRICE_BUCKET_COUNT;

    return (
      priceBucket +
      quantityBucket * PRICE_BUCKET_COUNT +
      quantityBlock * quantityStride +
      1
    );
  }

  private getCategorySortedId(visualIndex: number): number {
    const groupSize = TOTAL_ROWS / CATEGORY_COUNT;
    const categoryBucket = Math.floor(visualIndex / groupSize);
    const offsetInBucket = visualIndex % groupSize;

    return categoryBucket + offsetInBucket * CATEGORY_COUNT + 1;
  }

  private delay(durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(resolve, durationMs);
    });
  }

  private trimCache(): void {
    while (this.pageCache.size > MAX_CACHED_PAGES) {
      const oldestKey = this.pageCache.keys().next().value as
        | string
        | undefined;
      if (!oldestKey) {
        return;
      }
      this.pageCache.delete(oldestKey);
    }
  }
}
