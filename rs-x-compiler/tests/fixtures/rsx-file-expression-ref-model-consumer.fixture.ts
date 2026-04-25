import { subtotalLabel } from './expression-file-expression-ref-model.fixture';

import type { IExpression, IExpressionTree } from '@rs-x/expression-parser';

declare const currencySymbolExpression: IExpression<string>;
declare const subtotalExpression: IExpressionTree<number>;

const subtotalLabelExpression = subtotalLabel({
  currencySymbol: currencySymbolExpression,
  subtotal: subtotalExpression,
});

const typedSubtotalLabelExpression: IExpression<string> =
  subtotalLabelExpression;

void typedSubtotalLabelExpression;
