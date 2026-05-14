import type { IExpression } from '@rs-x/expression-parser';
import type {
  shippingFeeRsx,
  subtotalRsx,
} from './dependency-model.expressions';

export interface ImportedCompositionModel {
  subtotal: ReturnType<typeof subtotalRsx>;
  shippingFee: ReturnType<typeof shippingFeeRsx>;
  genericExpression: IExpression<number>;
}

export interface CircularModelA {
  child: CircularModelB;
}

export interface CircularModelB {
  parent: CircularModelA;
}
