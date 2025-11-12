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
   hasRebindNested?: boolean;
   isNew?: boolean;
   setValue?: (value: unknown) => void;
}
