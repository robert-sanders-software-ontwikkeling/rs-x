import { Injectable, SingletonFactory } from '@rs-x/core';

import type { MustProxify } from '../object-property-observer-proxy-pair-manager.type';

import type { IMustProxifyItemHandlerFactory } from './must-proxify-item-handler.factory.type';

@Injectable()
export class MustProxifyItemHandlerFactory
   extends SingletonFactory<unknown, unknown, MustProxify>
   implements IMustProxifyItemHandlerFactory
{
   constructor() {
      super();
   }

   public getId(index: unknown): unknown {
      return index;
   }

   protected createInstance(_: unknown, id: unknown): MustProxify {
      return (index) => index === id;
   }

   protected createId(index: unknown): unknown {
      return index;
   }
}
