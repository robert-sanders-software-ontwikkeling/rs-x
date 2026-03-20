import { Injectable } from '@rs-x/core';
import { IEventIdentifierResolver } from './event-identifier-resolver.interface';

@Injectable()
export class EventIdentifierResolver implements IEventIdentifierResolver {
   public $sender: unknown = null;
   public $event: unknown = null;
}
