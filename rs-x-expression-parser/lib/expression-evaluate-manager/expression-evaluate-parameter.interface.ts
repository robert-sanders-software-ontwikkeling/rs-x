export interface IExpressionEvaluateParameterId {
  index: unknown;
  context: unknown;
}

export interface IExpressionEvaluateParameter
  extends IExpressionEvaluateParameterId {
  reevaluate: () => void;
  resolved?: boolean;
}
