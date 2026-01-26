import { Injectable, Type } from '@rs-x/core';
import type { IIdentifierOwnerResolver } from './identifier-owner-resolver.interface';

@Injectable()
export class PropertyOwnerResolver implements IIdentifierOwnerResolver {
   public resolve(index: string, context: object): object | null {
      return Type.hasProperty(context, index) ? context : null;
   }
}
