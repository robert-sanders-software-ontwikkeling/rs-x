import { IDecoratorValidationMetadata } from './decorator-validator.interface';

export interface IDecoratorValidatorConfiguration {
   configure(validationMetadata: IDecoratorValidationMetadata[]): void;
}
