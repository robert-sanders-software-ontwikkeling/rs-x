import { InputDecorator } from './input.decorator';
import { IInput } from './input.interface';

export function Input(inputInfo?: IInput) {
   return <T extends object, K extends keyof T & (string | symbol)>(
      target: T,
      propertyKey: K,
      descriptor?: PropertyDescriptor
   ) => {
      InputDecorator.instance.decorate(
         target,
         propertyKey,
         descriptor,
         inputInfo
      );
   };
}