export interface IChainPart {
   object: unknown;
   id: unknown;
}

export interface IPropertyChange {
   chain?: IChainPart[];
   target: unknown;
   id?: unknown;
   newValue?: unknown;
   arguments?: unknown[];
   setValue?: (value: unknown) => void;
}
