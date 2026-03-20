import { Injectable } from '@rs-x/core';


import { IEventIdentifierOwnerResolver } from './event-identifier-owner-resolver.interface';
import { PredefinedPath } from './predefined-path.enum';

@Injectable()
export class EventIdentifierResolver implements IEventIdentifierOwnerResolver {
   public $sender: unknown;
   public $event: unknown;

   public resolve(pathRootProperty: string): IEventIdentifierOwnerResolver | null {
      return pathRootProperty === PredefinedPath.Event ||
         pathRootProperty === PredefinedPath.Sender
         ? this
         : null;
   }
}
