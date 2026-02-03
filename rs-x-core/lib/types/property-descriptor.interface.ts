import { type PropertyDescriptorType } from './property-descriptor-type.enum';

export interface IPropertyDescriptor {
  type: PropertyDescriptorType;
  descriptor: PropertyDescriptor;
}
