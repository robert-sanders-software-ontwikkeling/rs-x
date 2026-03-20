import { IDirectiveMetadata } from './directive-metadata.interface';

export interface IDirectiveDecorator {
   decorate(metadata: IDirectiveMetadata): void;
}
