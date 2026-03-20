import {
   Assertion,
   ConstructorType,
   Inject,
   Injectable,
   InjectionContainer,
} from '@rs-x/core';
import { IDomElementData } from '../dom-element-data/dom-element-data.interface';
import { IDomQuery } from '../dom-query/dom-query.interface';
import { IHTMLParser } from '../html-parser/html-parser.interface';
import { IResizeObserverService } from '../resize/resize-observer-service.interface';
import { RsXUIInjectionTokens } from '../rx-x-ui.injection-tokens';
import { TemplateContentBuilder } from '../template/template-content-builder';
import { IBindingManagerFactory } from './binding/binding-manager.factory.type';
import { IBindingQueue } from './binding/binding-queue.interface';
import { IViewChildContext } from './decorators/view-child/view-child-context.interface';
import { IEventManagerFactory } from './event-manager';
import {
   IControllerFactory,
   ICustomElementController,
   ICustomElementCoreServices,
   ICustomElementConnector,
   IWebComponentController,
   IWebComponentCoreServices,
   IWebComponentElementControllerFactory,
   IWebComponentThemeManager,
   WebComponentControllerFactoryToken,
} from './interfaces';
import { ISlotCHangeObserverFactory } from './slot-change-observer/slot-change-observer.factory.type';
import { WebComponentController } from './web-component-controller';
import { IDomService } from '../dom-service/dom-service.interface';


@Injectable()
export class WebComponentElementControllerFactory
   implements IWebComponentElementControllerFactory
{
   constructor(
      @Inject(RsXUIInjectionTokens.IWebComponentThemeManager)
      private readonly _themeManager: IWebComponentThemeManager,
      @Inject(RsXUIInjectionTokens.IResizeObserverService)
      private readonly _resizeObserverService: IResizeObserverService,
      @Inject(RsXUIInjectionTokens.IDomQuery)
      private readonly _domQuery: IDomQuery,
      @Inject(RsXUIInjectionTokens.IViewChildContext)
      private readonly _viewChildContext: IViewChildContext,
      @Inject(RsXUIInjectionTokens.IHTMLParser)
      private readonly _htmlParser: IHTMLParser,
      @Inject(RsXUIInjectionTokens.IDomElementData)
      private readonly _domElementData: IDomElementData,
      @Inject(RsXUIInjectionTokens.IBindingQueue)
      private readonly _bindingQueue: IBindingQueue,
      @Inject(RsXUIInjectionTokens.IBindingManagerFactory)
      private readonly _bindingManagerFactory: IBindingManagerFactory,
      @Inject(RsXUIInjectionTokens.IEventManagerFactory)
      private readonly _eventManagerFactory: IEventManagerFactory,
      @Inject(RsXUIInjectionTokens.ISlotCHangeObserverFactory)
      private readonly _slotCHangeObserverFactory: ISlotCHangeObserverFactory,
       @Inject(RsXUIInjectionTokens.IDomService)
      private readonly _domService: IDomService
   ) {}

   public create(
      element: ICustomElementConnector,

      template: string,
      styles: string | string[],
      factoryToken: WebComponentControllerFactoryToken
   ): IWebComponentController {
      const services = this.createWebComponentServices(
         element,
         template,
         styles
      );
      return this.createController(
         factoryToken ? factoryToken : WebComponentController,
         services
      );
   }

   private createController<
      T extends ICustomElementCoreServices,
      RT extends WebComponentController,
   >(factoryToken: WebComponentControllerFactoryToken, services: T): RT {
      Assertion.assertNotNullOrEmpty(factoryToken, 'factoryToken');

      if (typeof factoryToken === 'symbol') {
         const factory =
            InjectionContainer.get<
               IControllerFactory<ICustomElementController>
            >(factoryToken);
         return factory.create(services) as RT;
      }
      return new (factoryToken as ConstructorType<RT>)(services);
   }

   private createWebComponentServices(
      element: ICustomElementConnector,
      template: string,
      styles: string | string[]
   ): IWebComponentCoreServices {
      return {
         customElementConnector: element,
         bindingManagerFactory: this._bindingManagerFactory,
         bindingQueue: this._bindingQueue,
         eventManagerFactory: this._eventManagerFactory,
         domElementData: this._domElementData,
         domQuery: this._domQuery,
         templateBuilder: template
            ? new TemplateContentBuilder(this._htmlParser, template)
            : null,
         slotCHangeObserverFactory: this._slotCHangeObserverFactory,
         themeManager: this._themeManager,
         resizeObserverService: this._resizeObserverService,
         styles,
         viewChildContext: this._viewChildContext,
         domService: this._domService
      };
   }
}
