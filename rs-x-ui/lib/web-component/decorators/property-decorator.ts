import { IDecoratorValidator } from './decorator-validator.interface';
import { IPropertyDecorator } from './property-decorator.interface';

export abstract class PropertyDecorator<
   T extends object,
   TMetadata extends { propertyKey: PropertyKey },
   TDecoratorArgs = unknown,
   K extends PropertyKey = string | symbol,
> implements IPropertyDecorator<K, T, TDecoratorArgs> {
   protected constructor(
      private readonly _validator: IDecoratorValidator,
      private readonly _decoratorKey: symbol
   ) {}

   public decorate(
      target: T,
      propertyKey: K,
      descriptor?: PropertyDescriptor,
      args?: TDecoratorArgs
   ): void {
      this._validator.assertCanBedDecoratedAs(
         this._decoratorKey,
         target,
         propertyKey
      );

      const metadata = this.createDecoratorMetadata(
         target,
         propertyKey,
         descriptor,
         args
      );

      this.addMetaData(target, propertyKey, metadata);
   }

   protected abstract createDecoratorMetadata(
      target: T,
      propertyKey: K,
      _descriptor?: PropertyDescriptor,
      _args?: TDecoratorArgs
   ): TMetadata;

   private addMetaData(
      target: T,
      propertyKey: K,
      metaDataToAdd: TMetadata
   ): void {
      const targetConstructor = target.constructor;

      if (!Object.getOwnPropertyDescriptor(targetConstructor, this._decoratorKey)) {
         const parent = Object.getPrototypeOf(targetConstructor);
         const parentMetaData = Reflect.get(parent, this._decoratorKey);

         const metadata = this.isMetadataArray(parentMetaData)
            ? [...parentMetaData]
            : [];

         Reflect.set(targetConstructor, this._decoratorKey, metadata);
      }

      const currentMetaData = Reflect.get(targetConstructor, this._decoratorKey);

      if (!this.isMetadataArray(currentMetaData)) {
         throw new Error('Decorator metadata storage is invalid.');
      }

      const index = currentMetaData.findIndex(
         (metadata) => metadata.propertyKey === propertyKey
      );

      if (index >= 0) {
         currentMetaData[index] = metaDataToAdd;
      } else {
         currentMetaData.push(metaDataToAdd);
      }
   }

   private isMetadataArray(value: unknown): value is TMetadata[] {
      return Array.isArray(value);
   }
}