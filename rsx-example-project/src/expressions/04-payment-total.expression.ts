import { rsx } from '@rs-x/expression-parser';

import { model } from '../model';

export function evaluatePaymentTotalExpression(): unknown {
  return rsx('payments.lastAmount + fees.service')(model);
}
