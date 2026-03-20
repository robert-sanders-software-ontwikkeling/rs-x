import { ArrayObserver, CustomTagName, HtmlTagName, Input } from '@rs-x/core';
import { Observable } from 'rxjs';
import { RsXUIInjectionTokens } from '../../rx-x-core-ui.injection-tokens';
import { CustomElement } from '../../web-component/custom-element';
import { Directive, Output } from '../../web-component/decorators';
import { IRepeaterController, IRepeaterDirective } from './repeater.interfaces';

@Directive({
   prefix: CustomTagName.Repeater,
   appliesTo: [HtmlTagName.Template],
   controllerFactoryToken: RsXUIInjectionTokens.RepeaterControllerFactory,
})
export class RepeaterDirective
   extends CustomElement<IRepeaterController>
   implements IRepeaterDirective
{
   @Output() public itemsBound: Observable<void>;

   /**
    * The items to render
    * If the value is an instance of ArrayObserver items will automatically
    * rerendered when the array changes
    */
   @Input()
   public get items(): unknown[] | ArrayObserver<unknown> {
      return this.controller.items;
   }

   public set items(value: unknown[] | ArrayObserver<unknown>) {
      this.controller.items = value;
   }

   @Input({ oneTimeOnly: true })
   public get alias(): string {
      return this.controller.itemFieldName;
   }

   public set alias(value: string) {
      this.controller.itemFieldName = value;
   }
}
