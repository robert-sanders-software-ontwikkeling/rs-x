export interface IPropertyDecorator<
   K extends PropertyKey = string | symbol,
   T extends object = object,
   TDecoratorArgs = unknown
> {
   decorate(
      target: T,
      propertyKey: K,
      descriptor: PropertyDescriptor | undefined,
      decoratorArgs: TDecoratorArgs
   ): void;
}