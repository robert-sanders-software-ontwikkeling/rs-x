export interface IAppModel {
  order: {
    total: number;
  };
  discountRate: number;
  customer: {
    vip: boolean;
  };
  cart: {
    itemsCount: number;
  };
  shipping: {
    address: {
      country: string;
    };
  };
  payments: {
    lastAmount: number;
  };
  fees: {
    service: number;
  };
  inventory: {
    available: number;
  };
}

export const model: IAppModel = {
  order: { total: 140 },
  discountRate: 0.1,
  customer: { vip: true },
  cart: { itemsCount: 3 },
  shipping: { address: { country: 'NL' } },
  payments: { lastAmount: 82 },
  fees: { service: 3 },
  inventory: { available: 12 },
};
