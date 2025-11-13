import { Injectable, Type } from '@rs-x/core';
import { IIdentifierOwnerResolver } from './identifier-owner-resolver.interface';

@Injectable()
export class PropertyOwnerResolver implements IIdentifierOwnerResolver {
   public resolve(name: string, context: object): object {
      return Type.hasProperty(context, name) ? context : null;
   }
}
