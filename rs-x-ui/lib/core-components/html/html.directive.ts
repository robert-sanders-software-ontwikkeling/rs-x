import { CustomTagName, HtmlTagName, Input } from '@rs-x/core';
import { RsXUIInjectionTokens } from '../../rx-x-core-ui.injection-tokens';
import { CustomElement } from '../../web-component/custom-element';
import { Directive } from '../../web-component/decorators/directive/directive.decorator.function';
import { IHtmlController, IHtmlDirective } from './html.interfaces';

@Directive({
   prefix: CustomTagName.Html,
   appliesTo: [HtmlTagName.Template],
   controllerFactoryToken: RsXUIInjectionTokens.HtmlControllerFactory,
})
export class HtmlDirective
   extends CustomElement<IHtmlController>
   implements IHtmlDirective
{
   @Input()
   public get html(): string {
      return this.controller.html;
   }

   public set html(value: string) {
      this.controller.html = value;
   }
}
