export type SortKey = 'id' | 'name' | 'price' | 'quantity' | 'category';
export type SortDirection = 'asc' | 'desc';

export type RowData = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  category: string;
  updatedAt: string;
};

const categories = ['Hardware', 'Software', 'Design', 'Ops'];

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

export function createRowData(id: number): RowData {
  const zeroBasedId = id - 1;
  const price = 25 + (zeroBasedId % 1000) / 10;
  const quantity = 1 + (Math.floor(zeroBasedId / 1000) % 100);
  const category = categories[zeroBasedId % categories.length] ?? 'General';
  const month = pad(((zeroBasedId * 7) % 12) + 1);
  const day = pad(((zeroBasedId * 11) % 28) + 1);

  return {
    id,
    name: `Product ${id.toString().padStart(7, '0')}`,
    price,
    quantity,
    category,
    updatedAt: `2026-${month}-${day}`,
  };
}
