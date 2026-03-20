import { CustomTagName, HtmlTagName, Input } from '@rs-x/core';
import { RsXUIInjectionTokens } from '../../rx-x-core-ui.injection-tokens';
import { CustomElement } from '../../web-component/custom-element';
import { Directive } from '../../web-component/decorators';
import { IIfController, IIfDirective } from './if.interfaces';

@Directive({
   prefix: CustomTagName.If,
   appliesTo: [HtmlTagName.Template],
   controllerFactoryToken: RsXUIInjectionTokens.IfControllerFactory,
})
export class IfDirective
   extends CustomElement<IIfController>
   implements IIfDirective
{
   @Input()
   public get show(): boolean {
      return this.controller.show;
   }

   public set show(value: boolean) {
      this.controller.show = value;
   }
}
