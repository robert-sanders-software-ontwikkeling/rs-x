import { StructuralDirectiveRegistry } from '../structural-directive-registry';
import { IDirectiveMetadata } from './directive-metadata.interface';
import { IDirectiveDecorator } from './directive.decorator.interface';

export class DirectiveDecorator implements IDirectiveDecorator {
   public static readonly instance: IDirectiveDecorator =
      new DirectiveDecorator();

   private constructor() {}

   public decorate(directiveMetadata: IDirectiveMetadata): void {
      StructuralDirectiveRegistry.instance.registerDirective(directiveMetadata);
   }
}
