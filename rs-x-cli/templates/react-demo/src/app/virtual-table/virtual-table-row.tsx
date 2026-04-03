import { type FC, memo } from 'react';

import { useRsxExpression } from '@rs-x/react';

import type { RowView } from './virtual-table-controller';

type VirtualTableRowProps = {
  item: RowView;
};

const VirtualTableRowComponent: FC<VirtualTableRowProps> = ({ item }) => {
  const id = useRsxExpression(item.row.idExpr);
  const name = useRsxExpression(item.row.nameExpr);
  const category = useRsxExpression(item.row.categoryExpr);
  const price = useRsxExpression(item.row.priceExpr);
  const quantity = useRsxExpression(item.row.quantityExpr);
  const total = useRsxExpression(item.row.totalExpr);
  const updatedAt = useRsxExpression(item.row.updatedAtExpr);

  return (
    <div
      className="table-row"
      style={{ transform: `translateY(${item.top}px)` }}
    >
      <span data-label="ID">#{id ?? 0}</span>
      <span data-label="Name">{name ?? ''}</span>
      <span data-label="Category">{category ?? ''}</span>
      <span data-label="Price">€{price ?? 0}</span>
      <span data-label="Qty">{quantity ?? 0}</span>
      <span data-label="Total" className="total">
        €{total ?? 0}
      </span>
      <span data-label="Updated">{updatedAt ?? '--'}</span>
    </div>
  );
};

export const VirtualTableRow = memo(VirtualTableRowComponent);
