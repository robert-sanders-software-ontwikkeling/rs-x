import {
  generatedBenchmarkExpressionStrings,
  type IExpression,
  rsx,
} from '@rs-x/expression-parser';

import { model } from '../model';

export const benchmarkExpressionFactories: Array<() => IExpression> =
  generatedBenchmarkExpressionStrings.map((expression) => {
    const createExpression = rsx(expression);
    return () => createExpression(model);
  });
