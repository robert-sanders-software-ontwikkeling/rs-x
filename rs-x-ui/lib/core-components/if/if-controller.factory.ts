import {
   Assertion,
   IDomElementFactory,
   IDomQuery,
   Inject,
   Injectable,
   RsXCoreInjectionTokens,
} from '@rs-x/core';
import {
   ICustomElementCoreServices,
   IDirectiveControllerFactory,
} from '../../web-component/interfaces';
import { TemplatedElementFactory } from '../../web-component/template/templated-element.factory';
import { IfController } from './if.controller';
import { IIfController } from './if.interfaces';

@Injectable()
export class IfControllerFactory implements IDirectiveControllerFactory {
   constructor(
      @Inject(RsXCoreInjectionTokens.IDomQuery)
      private readonly _domQuery: IDomQuery,
      @Inject(RsXCoreInjectionTokens.IDomElementFactory)
      private readonly _domElementFactory: IDomElementFactory
   ) {}

   public create(services: ICustomElementCoreServices): IIfController {
      Assertion.assertInstanceOf(services.customElementConnector, HTMLTemplateElement);
      const templatedElementFactory = new TemplatedElementFactory(
         services.customElementConnector as HTMLTemplateElement,
         this._domQuery,
         this._domElementFactory,
         services.domElementData
      );
      return new IfController(services, templatedElementFactory);
   }
}
