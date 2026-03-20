import { WebComponentElementConstructor } from '../../interfaces';
import { RegisteredComponents } from '../../registered-components';
import { IComponentMetadata } from './component-metadata.interface';
import { IComponentDecorator } from './component.decorator.interface';

export class ComponentDecorator implements IComponentDecorator {
   public static readonly instance: IComponentDecorator =
      new ComponentDecorator();

   private constructor() {}

   private readonly _componentSelectors = new WeakMap<
      WebComponentElementConstructor,
      string
   >();

   public decorate(
      componentConstructor: WebComponentElementConstructor,
      componentMetadata: IComponentMetadata
   ): void {
      this._componentSelectors.set(
         componentConstructor,
         componentMetadata.selector
      );
      RegisteredComponents.instance.registerWebComponent(
         componentConstructor,
         componentMetadata
      );
   }

   public getComponentSelector(
      componentType: WebComponentElementConstructor
   ): string {
      return this._componentSelectors.get(componentType)!;
   }
}
