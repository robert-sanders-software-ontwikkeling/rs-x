import { Injectable } from '@rs-x-core';
import { createCustomEqual } from 'fast-equals';
import { isObservable } from 'rxjs';
import { IEqualityService } from './equality-service.interface';

@Injectable()
export class EqualityService implements IEqualityService {
   public isEqual = createCustomEqual({
      createCustomConfig: (baseConfig) => ({
         ...baseConfig,
         areObjectsEqual: (a, b, equalityCheck) => {
            if (isObservable(a) && isObservable(b)) {
               return a === b;
            }

            return baseConfig.areObjectsEqual(a, b, equalityCheck);
         },
      }),
   });
}
