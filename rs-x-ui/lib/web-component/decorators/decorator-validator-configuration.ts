import {
   IDecoratorValidator,
   IDecoratorValidationMetadata,
} from './decorator-validator.interface';

export class DecoratorValidatorConfiguration {
   constructor(private readonly _decoratorValidator: IDecoratorValidator) {}

   public configure(validationMetadata: IDecoratorValidationMetadata[]): void {
      validationMetadata.forEach((metadata) =>
         this._decoratorValidator.registerDecorator(metadata)
      );
   }
}
