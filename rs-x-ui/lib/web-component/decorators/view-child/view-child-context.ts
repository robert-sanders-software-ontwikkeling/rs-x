import { ConstructorType, Injectable } from '@rs-x/core';
import { viewchildKey } from './view-child.decorator.key';
import { IViewChildContext } from './view-child-context.interface';
import { IViewChildMetadata } from './view-child-metadata.interface';

@Injectable()
export class ViewChildContext implements IViewChildContext {
   public getViewChildren(type: ConstructorType): IViewChildMetadata[] {
      return type[viewchildKey];
   }

   public getViewChild(
      type: ConstructorType,
      propertyKey: PropertyKey
   ): IViewChildMetadata | undefined {
      return this.getViewChildren(type).find(
         (viewChild) => viewChild.propertyKey === propertyKey
      );
   }

   public clearViewChildren(object: object): void {
      this.getViewChildren(
         object.constructor as ConstructorType<unknown>
      )?.forEach((viewChild) => delete object[viewChild.key]);
   }
}
