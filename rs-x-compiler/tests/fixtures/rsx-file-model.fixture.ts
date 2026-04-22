export interface IModel {
  user: {
    name: string;
  };
  lines: Array<{
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}
