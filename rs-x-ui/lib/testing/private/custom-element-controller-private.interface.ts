import { Subscription } from 'rxjs/internal/Subscription';

export interface ICustomElementControllerPrivate {
   _rebuildContentSubscription: Subscription;
   _boundSubscription: Subscription;
   _attaching: boolean;
   _isAttached: boolean;
   contentContainerElement: Element | ShadowRoot;

   disposeContent(): void;
   updateContent(): void;
}
