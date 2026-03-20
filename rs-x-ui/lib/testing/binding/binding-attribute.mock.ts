import { IWebComponentController } from '../../web-component';
import {
   BindingType,
   IBindingAttribute,
} from '../../web-component/binding/interfaces';
import { ElementMock } from '../element.mock';
import { WebComponentElementMock } from '../web-component-element.mock';

export class BindingAttributeMock<
   T extends IWebComponentController = IWebComponentController,
> implements IBindingAttribute
{
   public name!: string;
   public bindingExpression!: string;
   public bindingType!: BindingType;
   public ownerElement!: Element;
   public component!: WebComponentElementMock<T>;

   constructor(properties: Partial<IBindingAttribute>) {
      Object.assign(this, properties);
   }
}
