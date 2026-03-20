import { KeyedInstanceFactoryMock } from '@rs-x/core/testing';
import {
   ICustomElement,
   ICustomElementController,
   IWebComponentCoreServices,
} from '../web-component/interfaces';
import { CustomElementCoreServicesMock } from './custom-element-core-services.mock';
import { DomContentBuilderMock } from './dom-content-builder.mock';
import { DomServiceMock } from './dom.service.mock';
import { ResizeObserverServiceMock } from './resize-observer-service.mock';
import { SlotChangeObserverMock } from './slot-change-observer.mock';
import { ViewChildContextMock } from './view-child-context.mock';
import { WebComponentThemeManagerMock } from './web-component-theme-manager.mock';
import { ICustomElementConnector } from '../web-component/interfaces';

export class WebComponentCoreServicesMock
   extends CustomElementCoreServicesMock
   implements IWebComponentCoreServices
{
   public readonly resizeObserverService = new ResizeObserverServiceMock();
   public readonly themeManager = new WebComponentThemeManagerMock();
   public readonly slotChangeObserver = new SlotChangeObserverMock();
   public readonly slotCHangeObserverFactory = new KeyedInstanceFactoryMock() as unknown as IWebComponentCoreServices['slotCHangeObserverFactory'];
   public readonly templateBuilder = new DomContentBuilderMock();
   public readonly viewChildContext = new ViewChildContextMock();
   public readonly domService = new DomServiceMock();

   constructor(
      public override readonly customElementConnector: ICustomElementConnector = {} as ICustomElementConnector,
      public override readonly customElement: ICustomElement<ICustomElementController> = null as unknown as ICustomElement<ICustomElementController>,
      public readonly styles: string | string[] = ''
   ) {
      super(customElementConnector, customElement);
   }
}
