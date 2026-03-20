import { IComponentDecorator } from './decorators/component/component.decorator.interface';
import {
   IDomContentBuilder,
   WebComponentElementConstructor,
} from './interfaces';

export class WithSingleComponentContentBuilder implements IDomContentBuilder {
   constructor(
      private readonly _componentType: WebComponentElementConstructor,
      private readonly _document: Document,
      private readonly _componentDecorator: IComponentDecorator
   ) {}
   public buildContent(): Node[] {
      return [
         this._document.createElement(
            this._componentDecorator.getComponentSelector(this._componentType)
         ),
      ];
   }
}
