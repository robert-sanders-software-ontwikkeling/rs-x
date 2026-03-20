
import { DecoratorValidator } from '../decorator-validator';
import { PropertyDecorator } from '../property-decorator';
import { IPropertyDecorator } from '../property-decorator.interface';
import { IInputMetadata } from './input-metadata.interface';
import { inputKey } from './input.decorator.key';
import { IInput } from './input.interface';

export class InputDecorator extends PropertyDecorator<
   object,
   IInputMetadata,
   IInput
> {
   public static readonly instance: IPropertyDecorator = new InputDecorator();

   private constructor() {
      super(DecoratorValidator.instance, inputKey);
   }

   protected createDecoratorMetadata(
      _target: object,
      propertyKey: string,
      _descriptor: PropertyDescriptor,
      inputInfo: IInput
   ): IInputMetadata {
      const attributeName = inputInfo?.attributeName
         ? inputInfo.attributeName
         : (propertyKey as string);

      return {
         attributeName,
         propertyKey: propertyKey,
         reflectToAttribute: inputInfo?.reflectToAttribute,
         fromString: inputInfo?.fromString,
         valueToString: inputInfo?.valueToString,
         rebuildContentOnChange: inputInfo?.rebuildContentOnChange,
         defaultValue: inputInfo?.defaultValue,
      };
   }
}
