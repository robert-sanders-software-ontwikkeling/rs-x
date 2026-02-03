export interface IChainPart {
  context: unknown;
  index: unknown;
}

export interface IPropertyChange {
  chain?: IChainPart[];
  target: unknown;
  index?: unknown;
  newValue?: unknown;
  arguments?: unknown[];
  setValue?: (value: unknown) => void;
}
