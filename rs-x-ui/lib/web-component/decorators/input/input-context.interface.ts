import { ConstructorType } from '@rs-x/core';
import { IInputMetadata } from './input-metadata.interface';

export interface IInputContext {
   getInputInfo(type: ConstructorType, propertyName: string): IInputMetadata | undefined;
   getInputs(object: ConstructorType): IInputMetadata[];
   getInputForAttribute(
      type: ConstructorType,
      attributeName: string,
      reflectToAttribute: boolean
   ): IInputMetadata | undefined;
   getInputForReflectToAttributeProperty(
      type: ConstructorType,
      propertyName: string
   ): IInputMetadata | undefined;
   getObservedAttributes(object: unknown): string[];
}
