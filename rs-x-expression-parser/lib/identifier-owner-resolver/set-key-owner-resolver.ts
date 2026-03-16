import { Injectable } from '@rs-x/core';

import type { IIdentifierOwnerResolver } from './identifier-owner-resolver.interface';

@Injectable()
export class SetKeyOwnerResolver implements IIdentifierOwnerResolver {
  public resolve(index: unknown, set: unknown): object | null {
    if (!(set instanceof Set)) {
      return null;
    }

    return set.has(index) ? set : null;
  }
}
