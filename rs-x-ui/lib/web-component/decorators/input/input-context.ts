import { ConstructorType, Injectable } from '@rs-x/core';
import { IInputContext } from './input-context.interface';
import { IInputMetadata } from './input-metadata.interface';
import { inputKey } from './input.decorator.key';

@Injectable()
export class InputContext implements IInputContext {
   public getInputs(type: ConstructorType<unknown>): IInputMetadata[] {
      return type[inputKey];
   }

   public getInputInfo(
      type: ConstructorType<unknown>,
      propertyName: string
   ): IInputMetadata | undefined {
      return this.getInputs(type)?.find((i) => i.propertyKey === propertyName);
   }

   public getInputForAttribute(
      type: ConstructorType<unknown>,
      attributeName: string,
      reflectToAttributeOnly: boolean
   ): IInputMetadata | undefined {
      return this.getInputs(type)?.find(
         (input) =>
            (!reflectToAttributeOnly || input.reflectToAttribute) &&
            input.attributeName.toLowerCase() === attributeName.toLowerCase()
      );
   }

   public getInputForReflectToAttributeProperty(
      type: ConstructorType<unknown>,
      propertyName: PropertyKey
   ): IInputMetadata | undefined {
      return this.getInputs(type)?.find(
         (input) =>
            input.reflectToAttribute && input.propertyKey === propertyName
      );
   }

   public getObservedAttributes(type: ConstructorType<unknown>): string[] {
      return this.getInputs(type)
         ?.filter((input) => input.reflectToAttribute)
         .map((input) => input.attributeName);
   }
}
