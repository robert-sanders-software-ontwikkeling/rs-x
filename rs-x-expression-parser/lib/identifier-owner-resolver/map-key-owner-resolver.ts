import { Injectable } from '@rs-x/core';

import type { IIdentifierOwnerResolver } from './identifier-owner-resolver.interface';

@Injectable()
export class MapKeyOwnerResolver implements IIdentifierOwnerResolver {
   public resolve(index: unknown, map: Map<unknown, unknown>): object | null {
      return map.has?.(index) ? map : null;
   }
}
