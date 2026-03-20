import { OutputDecorator } from './output.decorator';

export function Output(eventName?: string) {
   return <T extends object, K extends keyof T & (string | symbol)>(
      target: T,
      propertyKey: K,
      descriptor?: PropertyDescriptor
   ) => {
      OutputDecorator.instance.decorate(
         target,
         propertyKey,
         descriptor,
         eventName
      );
   };
}