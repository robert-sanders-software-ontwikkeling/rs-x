import { Injectable } from '@rs-x/core';

import type { IIdentifierOwnerResolver } from './identifier-owner-resolver.interface';

@Injectable()
export class MapKeyOwnerResolver implements IIdentifierOwnerResolver {
  public resolve(index: unknown, map: unknown): object | null {
    if (!(map instanceof Map)) {
      return null;
    }

    return map.has(index) ? map : null;
  }
}
