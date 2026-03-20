import { WebComponentElementConstructor } from '../../interfaces';
import { IComponentMetadata } from './component-metadata.interface';
import { ComponentDecorator } from './component.decorator';

export function Component<T extends WebComponentElementConstructor>(
   componentMetadata: IComponentMetadata
): (componentConstructor: T) => void {
   return (componentConstructor: T) => {
      ComponentDecorator.instance.decorate(
         componentConstructor,
         componentMetadata
      );
   };
}
