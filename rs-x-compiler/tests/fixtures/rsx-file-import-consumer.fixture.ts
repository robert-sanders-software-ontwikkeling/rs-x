import totalExpr from './expression-file.fixture.rsx';

import type { IExpression } from '@rs-x/expression-parser';
import type { IModel } from './rsx-file-model.fixture';

declare const model: IModel;

const expression = totalExpr(model);
const typedExpression: IExpression<number> = expression;
void expression;
void typedExpression;
