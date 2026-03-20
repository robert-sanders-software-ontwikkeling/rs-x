import {
   Assertion,
   IHTMLParser,
   Inject,
   Injectable,
   RsXCoreInjectionTokens,
} from '@rs-x/core';

import {
   ICustomElementCoreServices,
   IDirectiveControllerFactory,
} from '../../web-component/interfaces';

import { HtmlController } from './html.controller';

@Injectable()
export class HtmlControllerFactory implements IDirectiveControllerFactory {
   constructor(
      @Inject(RsXCoreInjectionTokens.IHTMLParser)
      private readonly _htmlParser: IHTMLParser
   ) {}

   public create(services: ICustomElementCoreServices): HtmlController {
      Assertion.assertInstanceOf(services.customElementConnector, HTMLTemplateElement);
      return new HtmlController(services, this._htmlParser);
   }
}
