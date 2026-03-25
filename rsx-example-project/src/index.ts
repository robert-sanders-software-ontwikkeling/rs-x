import { evaluateOrderTotalExpression } from './expressions/01-order-total.expression';
import { evaluateVipCartExpression } from './expressions/02-vip-cart.expression';
import { evaluateShippingTaxExpression } from './expressions/03-shipping-tax.expression';
import { evaluatePaymentTotalExpression } from './expressions/04-payment-total.expression';
import { evaluateInventoryGapExpression } from './expressions/05-inventory-gap.expression';
import { bootstrapRsx } from './bootstrap';

async function main(): Promise<void> {
  await bootstrapRsx();

  const values = [
    evaluateOrderTotalExpression(),
    evaluateVipCartExpression(),
    evaluateShippingTaxExpression(),
    evaluatePaymentTotalExpression(),
    evaluateInventoryGapExpression(),
  ];

  console.log('RS-X app started. Evaluated expressions:', values.length);
}

void main();
