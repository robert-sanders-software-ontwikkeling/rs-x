import {
   WebComponentControllerConstructor,
   WebComponentElementConstructor,
} from '../../interfaces';
import { DecoratorValidator } from '../decorator-validator';
import { PropertyDecorator } from '../property-decorator';
import { IPropertyDecorator } from '../property-decorator.interface';
import { IViewChildMetadata } from './view-child-metadata.interface';
import { viewchildKey } from './view-child.decorator.key';

type ViewChildTarget =
   | WebComponentElementConstructor
   | WebComponentControllerConstructor;

type AnyDecoratedObject = object;

interface IQuerySelectorHost {
   querySelector<TResult extends Element = Element>(
      selectors: string
   ): TResult | null;
}

export class ViewChildDecorator extends PropertyDecorator<
   object,
   IViewChildMetadata,
   string
> {
   public static readonly instance: IPropertyDecorator<
      PropertyKey,
      AnyDecoratedObject,
      string
   > = new ViewChildDecorator();

   private constructor() {
      super(DecoratorValidator.instance, viewchildKey);
   }

   protected createDecoratorMetadata<
      T extends ViewChildTarget,
      K extends keyof T & PropertyKey
   >(
      target: T,
      propertyKey: K,
      _descriptor: PropertyDescriptor,
      name: string
   ): IViewChildMetadata {
      return {
         key: this.createPropertyDescription(target, propertyKey, name),
         name,
         propertyKey: String(propertyKey),
      };
   }

   private createPropertyDescription<
      T extends ViewChildTarget,
      K extends keyof T & PropertyKey
   >(
      target: T,
      propertyKey: K,
      name: string
   ): symbol {
      const key = Symbol.for(String(propertyKey));

      const descriptor: PropertyDescriptor = {
         get: function (this: IQuerySelectorHost): Element | null {
            const self = this as IQuerySelectorHost &
               Record<symbol, Element | null | undefined>;

            if (self[key] === undefined) {
               self[key] = this.querySelector(`[_${name}]`);
            }

            return self[key] ?? null;
         },
      };

      Object.defineProperty(target, propertyKey, descriptor);

      return key;
   }
}