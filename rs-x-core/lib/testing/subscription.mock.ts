import { Subscription } from 'rxjs';

export class SubscriptionMock extends Subscription {
   public override closed = false;
   public override unsubscribe = jest.fn();
   public override add = jest.fn();
}
