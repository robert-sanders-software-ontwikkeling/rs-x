import { rsx } from '@rs-x/expression-parser';

import { model } from '../model';

export function evaluateShippingTaxExpression(): unknown {
  return rsx('shipping.address.country === "NL" ? 21 : 0')(model);
}
