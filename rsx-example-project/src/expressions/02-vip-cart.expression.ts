import { rsx } from '@rs-x/expression-parser';

import { model } from '../model';

export function evaluateVipCartExpression(): unknown {
  return rsx('customer.vip && cart.itemsCount > 2')(model);
}
