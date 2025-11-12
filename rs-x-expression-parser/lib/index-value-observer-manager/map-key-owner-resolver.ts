import { Injectable } from '@rs-x-core';
import { IIdentifierOwnerResolver } from './identifier-owner-resolver.interface';

@Injectable()
export class MapKeyOwnerResolver implements IIdentifierOwnerResolver {
   public resolve(key: unknown, map: Map<unknown, unknown>): object {
      return map.has?.(key) ? map : null;
   }
}
