import { CustomTagName, HtmlTagName, Input } from '@rs-x/core';
import { CustomElement } from '../../web-component/custom-element';
import { Directive } from '../../web-component/decorators';
import { RsXUIInjectionTokens } from '../../rx-x-core-ui.injection-tokens';
import {
   IStaticHtmlController,
   IStaticHtmlDirective,
} from './static-html.interfaces';

@Directive({
   prefix: CustomTagName.StaticHtml,
   appliesTo: [HtmlTagName.Template],
   controllerFactoryToken: RsXUIInjectionTokens.StaticHtmlControllerFactory,
})
export class StaticHtmlDirective
   extends CustomElement<IStaticHtmlController>
   implements IStaticHtmlDirective
{
   @Input()
   public get html(): string {
      return this.controller.html;
   }

   public set html(value: string) {
      this.controller.html = value;
   }
}
