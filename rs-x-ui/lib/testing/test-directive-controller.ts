import { WebComponentController } from '../web-component/web-component-controller';

export class TestDirectiveController extends WebComponentController {
   public override get parent(): Element {
      return null as unknown as Element;
   }

   public override get content(): readonly Node[] {
      return [];
   }

   public override buildContent(): void {
      return;
   }

   protected override getContentContainer(element: Element): Element | ShadowRoot {
      return element;
   }

   protected override getEventElements(): Element[] {
      return [];
   }
}
