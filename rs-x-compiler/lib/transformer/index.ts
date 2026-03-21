export interface ITransformerScaffold {
  readonly folder: 'transformer';
  readonly enabled: false;
}

export function createTransformerScaffold(): ITransformerScaffold {
  return {
    folder: 'transformer',
    enabled: false,
  };
}
