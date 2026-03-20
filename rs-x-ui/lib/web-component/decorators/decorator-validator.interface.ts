export interface IDecoratorValidationMetadata {
   decoratorKey: symbol;
   name: string;
   forbiddenDecoratorKeys: symbol[];
}

export interface IDecoratorValidator {
   registerDecorator(metadata: IDecoratorValidationMetadata): void;
   assertCanBedDecoratedAs(
      decoratorId: symbol,
      target: object,
      propertyKey: PropertyKey
   ): void;
}