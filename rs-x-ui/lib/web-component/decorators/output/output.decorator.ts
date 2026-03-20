
import { Subject } from 'rxjs';
import { IOutputMetadata } from './output-metadata.interface';
import { outputKey } from './output.decorator.key';
import { PropertyDecorator } from '../property-decorator';
import { IPropertyDecorator } from '../property-decorator.interface';
import { DecoratorValidator } from '../decorator-validator';

export class OutputDecorator extends PropertyDecorator<
   object,
   IOutputMetadata,
   string
> {
   public static readonly instance: IPropertyDecorator = new OutputDecorator();

   private constructor() {
      super(DecoratorValidator.instance, outputKey);
   }

   protected createDecoratorMetadata(
      target: object,
      propertyKey: string,
      descriptor: PropertyDescriptor,
      eventName: string
   ): IOutputMetadata {
      if (!descriptor) {
         this.createOutputDescriptor(target, propertyKey);
      }
      return {
         eventName: `${eventName ? eventName : propertyKey}.on`,
         propertyKey,
      };
   }

   private createOutputDescriptor(
      target: object,
      propertyKey: PropertyKey
   ): void {
      const descriptor: PropertyDescriptor = {};
      const fieldName = Symbol(propertyKey.toString());
      const getter = function (this: Record<symbol, Subject<void>>): Subject<void> {
         if (!this[fieldName]) {
            this[fieldName] = new Subject();
         }
         return this[fieldName];
      };
      descriptor.get = getter;

      Object.defineProperty(target, propertyKey, descriptor);
   }
}
