import { HtmlTagName } from '@rs-x/core';

export interface IDirectiveMetadata {
   priority?: number;
   name: string;
   appliesTo?: HtmlTagName[];
   factortyToken: symbol;
}
