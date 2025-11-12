import { ISingletonFactory } from '@rs-x-core';
import { MustProxify } from '../object-property-observer-proxy-pair-manager.type';

export type IMustProxifyItemHandlerFactory = ISingletonFactory<
   unknown,
   unknown,
   MustProxify
>;
