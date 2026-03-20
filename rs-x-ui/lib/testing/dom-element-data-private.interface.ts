import { Subscription } from 'rxjs';

export interface IDomElementDataPrivate {
   _data: Map<Node, Record<string, unknown>>;
   _removedSubscription: Subscription;
}
