import { Injectable } from '@rs-x-core';
import { IIdentifierOwnerResolver } from './identifier-owner-resolver.interface';

@Injectable()
export class ArrayIndexOwnerResolver implements IIdentifierOwnerResolver {
   public resolve(index: string | number, array: unknown[]): object {
      const normalizedIndex = Number(index);
      if (isNaN(normalizedIndex) || !Array.isArray(array)) {
         return null;
      }

      return normalizedIndex >= 0 && normalizedIndex < array.length
         ? array
         : null;
   }
}
