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

import { StaticHtmlController } from './static-html.controller';

@Injectable()
export class StaticHtmlControllerFactory
   implements IDirectiveControllerFactory
{
   constructor(
      @Inject(RsXCoreInjectionTokens.IHTMLParser)
      private readonly _htmlParser: IHTMLParser
   ) {}

   public create(services: ICustomElementCoreServices): StaticHtmlController {
      Assertion.assertInstanceOf(services.customElementConnector, HTMLTemplateElement);
      return new StaticHtmlController(services, this._htmlParser);
   }
}
