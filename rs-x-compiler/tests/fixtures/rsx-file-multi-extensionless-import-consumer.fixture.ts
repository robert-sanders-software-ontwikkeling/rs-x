import { firstLineName, total } from './expression-file-multi.fixture';

import type { IExpression } from '@rs-x/expression-parser';
import type { IModel } from './rsx-file-model.fixture';

declare const model: IModel;

const totalExpression = total(model);
const firstLineNameExpression = firstLineName(model);

const typedTotalExpression: IExpression<number> = totalExpression;
const typedFirstLineNameExpression: IExpression<string> =
  firstLineNameExpression;

void typedTotalExpression;
void typedFirstLineNameExpression;
