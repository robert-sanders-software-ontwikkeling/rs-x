import { composedExternalTotal } from './expression-file-external-expression-ref-consumer.fixture';
import { sourceTotal } from './expression-file-external-expression-ref-source.fixture';

import type { IExpression } from '@rs-x/expression-parser';

declare const valueExpression: IExpression<number>;

const sourceExpression = sourceTotal({
  value: valueExpression,
});

const composedExpression = composedExternalTotal({
  c: sourceExpression,
});

const typedComposedExpression: IExpression<number> = composedExpression;

void typedComposedExpression;
