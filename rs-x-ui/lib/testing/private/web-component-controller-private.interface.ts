import { Subscription } from 'rxjs/internal/Subscription';
import {
   IResizeObserverService,
   ISlotChangeObserver,
   IStyle,
   IViewChildContext,
} from '../../web-component/interfaces';
import { ICustomElementControllerPrivate } from './custom-element-controller-private.interface';

export interface IWebComponentControllerPrivate
   extends ICustomElementControllerPrivate {
   readonly _styles: string;
   readonly _slotChangeObserver: ISlotChangeObserver;
   readonly _resizeObserverService: IResizeObserverService;
   readonly _viewChildContext: IViewChildContext;
   _themeChangedSubscription: Subscription;
   _resizedSubscription: Subscription;
   _themeStyleElement: HTMLStyleElement;
   _customStyle: IStyle;
   _content: Node[];
   _parent: Element;
}
