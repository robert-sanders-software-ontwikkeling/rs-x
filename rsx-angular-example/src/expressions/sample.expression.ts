import { rsx } from '@rs-x/expression-parser';

import { model } from '../model';

export const sampleExpression = rsx('x + y')(model);
