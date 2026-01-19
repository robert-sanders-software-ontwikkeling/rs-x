import { Injectable } from '@rs-x/core';
import { IIdentifierOwnerResolver } from './identifier-owner-resolver.interface';

@Injectable()
export class MapKeyOwnerResolver implements IIdentifierOwnerResolver {
   public resolve(index: unknown, map: Map<unknown, unknown>): object {
      return map.has?.(index) ? map : null;
   }
}
