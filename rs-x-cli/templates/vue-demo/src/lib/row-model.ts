import { type IExpression, rsx } from '@rs-x/expression-parser';

import type { RowData } from './row-data';

export type RowModel = {
  model: RowData;
  idExpr: IExpression<number>;
  nameExpr: IExpression<string>;
  categoryExpr: IExpression<string>;
  priceExpr: IExpression<number>;
  quantityExpr: IExpression<number>;
  updatedAtExpr: IExpression<string>;
  totalExpr: IExpression<number>;
};

export function createRowModel(): RowModel {
  const model: RowData = {
    id: 0,
    name: '',
    price: 0,
    quantity: 0,
    category: 'General',
    updatedAt: '2026-01-01',
  };

  return {
    model,
    idExpr: rsx<number>('id')(model),
    nameExpr: rsx<string>('name')(model),
    categoryExpr: rsx<string>('category')(model),
    priceExpr: rsx<number>('price')(model),
    quantityExpr: rsx<number>('quantity')(model),
    updatedAtExpr: rsx<string>('updatedAt')(model),
    totalExpr: rsx<number>('price * quantity')(model),
  };
}

export function updateRowModel(target: RowModel, data: RowData): void {
  target.model.id = data.id;
  target.model.name = data.name;
  target.model.price = data.price;
  target.model.quantity = data.quantity;
  target.model.category = data.category;
  target.model.updatedAt = data.updatedAt;
}
