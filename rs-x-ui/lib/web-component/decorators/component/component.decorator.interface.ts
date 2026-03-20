import { WebComponentElementConstructor } from '../../interfaces';
import { IComponentMetadata } from './component-metadata.interface';

export interface IComponentDecorator {
   decorate(
      componentConstructor: WebComponentElementConstructor,
      componentMetadata: IComponentMetadata
   ): void;
   getComponentSelector(componentType: WebComponentElementConstructor): string;
}
