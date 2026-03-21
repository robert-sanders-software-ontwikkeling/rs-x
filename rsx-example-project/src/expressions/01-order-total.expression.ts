import { rsx } from '@rs-x/expression-parser';

import { model } from '../model';

export function evaluateOrderTotalExpression(): unknown {
  return rsx('order.total > 100 ? order.total * discountRate : order.total')(model);
}
