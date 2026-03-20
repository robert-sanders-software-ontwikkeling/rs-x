import { BindingType, IBinding } from '../../web-component';
import { IInputMetadata } from '../../web-component/decorators/input/input-metadata.interface';
import { createElementMock } from '../element.mock';

import { ExpressionMock, IdentifierExpressionMock } from '@rs-x/expression-parser/testing';


export class BindingMock implements IBinding {
   public readonly bindingOwnerElement: Element | Node = createElementMock();
   public readonly bindingType!: BindingType;
   public readonly left = new IdentifierExpressionMock();
   public readonly right = new ExpressionMock();
   public readonly slot?: HTMLSlotElement;
   public readonly inputInfo: IInputMetadata = {} as IInputMetadata;

   constructor(properties?: Partial<IBinding>) {
      Object.assign(this, properties);
   }

   public readonly dispose = jest.fn();
}
