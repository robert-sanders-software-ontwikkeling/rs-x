import {
   Assertion,
   DomItemElementSynchronizer,
   IDomElementFactory,
   IDomQuery,
   Inject,
   Injectable,
   RsXCoreInjectionTokens,
} from '@rs-x/core';
import { ICustomElementCoreServices } from '../../web-component/interfaces';
import { TemplatedElementFactory } from '../../web-component/template/templated-element.factory';
import { RepeaterController } from './repeater.controller';
import { IRepeaterController } from './repeater.interfaces';
@Injectable()
export class RepeaterControllerFactory implements IDirectiveControllerFactory {
   constructor(
      @Inject(RsXCoreInjectionTokens.IDomQuery)
      private readonly _domQuery: IDomQuery,
      @Inject(RsXCoreInjectionTokens.IDomElementFactory)
      private readonly _domElementFactory: IDomElementFactory
   ) {}

   public create(services: ICustomElementCoreServices): IRepeaterController {
      Assertion.assertInstanceOf(services.customElementConnector, HTMLTemplateElement);
      const templateElementFactory = new TemplatedElementFactory(
         services.customElementConnector as HTMLTemplateElement,
         this._domQuery,
         this._domElementFactory,
         services.domElementData
      );
      const synchronisize = new DomItemElementSynchronizer(
         services.customElementConnector.parentElement,
         templateElementFactory
      );
      return new RepeaterController(services, synchronisize);
   }
}
