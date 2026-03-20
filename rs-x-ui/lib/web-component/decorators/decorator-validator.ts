

import { InvalidOperationException, Type } from '@rs-x/core';
import {
   IDecoratorValidator,
   IDecoratorValidationMetadata,
} from './decorator-validator.interface';

export class DecoratorValidator implements IDecoratorValidator {
   public static readonly instance: IDecoratorValidator =
      new DecoratorValidator();
   private readonly _decoratorMetadata = new Map<
      symbol,
      IDecoratorValidationMetadata
   >();

   private constructor() {}

   public registerDecorator(metadata: IDecoratorValidationMetadata): void {
      this._decoratorMetadata.set(metadata.decoratorKey, metadata);
   }

   public assertCanBedDecoratedAs(
      decoratorId: symbol,
      target: object,
      propertyKey: string
   ): void {
      const targetDecoratorMetadata = this._decoratorMetadata.get(decoratorId);

      const errors = targetDecoratorMetadata?.forbiddenDecoratorKeys
         .filter((forbiddenDecoratorKey) =>
            Type.cast<Record<symbol, { propertyKey: string }[]>>(
               target.constructor
            )[forbiddenDecoratorKey]?.some(
               (input) => input.propertyKey === propertyKey
            )
         )
         .map(
            (forbiddenDecoratorMetadata) =>
               `Property '${propertyKey}' on ${target.constructor.name} can not be ${targetDecoratorMetadata.name} because it is already defined as ${this._decoratorMetadata.get(forbiddenDecoratorMetadata)?.name}`
         );

      if (errors?.length) {
         throw new InvalidOperationException(errors.join('\n'));
      }
   }
}
