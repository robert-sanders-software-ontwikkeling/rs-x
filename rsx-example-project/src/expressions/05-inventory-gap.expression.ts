import { rsx } from '@rs-x/expression-parser';

import { model } from '../model';

export function evaluateInventoryGapExpression(): unknown {
  return rsx('inventory.available - cart.itemsCount')(model);
}
