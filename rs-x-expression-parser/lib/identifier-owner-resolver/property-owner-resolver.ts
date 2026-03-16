import { dataProperties, Injectable, Type } from '@rs-x/core';

import type { IIdentifierOwnerResolver } from './identifier-owner-resolver.interface';

const datePropertySet = new Set<string>(dataProperties);

@Injectable()
export class PropertyOwnerResolver implements IIdentifierOwnerResolver {
  public resolve(index: string, context: object): object | null {
    if (Type.hasProperty(context, index)) {
      return context;
    }

    if (context instanceof Date && datePropertySet.has(index)) {
      return context;
    }

    return null;
  }
}
