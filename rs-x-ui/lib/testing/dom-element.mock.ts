import { ITracker } from '@rs-x/core';
import { IPosition } from '../align-to/position.interface';
import { IDomElement } from '../dom-element/dom-element.interface';
import { HTMLElementMock } from './html-element.mock';

export interface IDomElementMockProperties {
   id?: string;
   nativeElement?: HTMLElement;
   marginLeft?: number;
   marginRight?: number;
   marginTop?: number;
   marginBottom?: number;
   paddingLeft?: number;
   paddingRight?: number;
   paddingTop?: number;
   paddingBottom?: number;
   borderLeft?: number;
   borderRight?: number;
   borderBottom?: number;
   borderTop?: number;
   left?: number;
   top?: number;
   height?: number;
   width?: number;
   scrollTop?: number;
   scrollLeft?: number;
   firstChild?: IDomElement;
   children?: IDomElement[];
   hasXOverflow?: boolean;
   hasYOverflow?: boolean;
   isVisible?: boolean;
   innerHtml?: string;
   enabled?: boolean;
   mousedown?: ITracker<MouseEvent, unknown>;
   mousemove?: ITracker<MouseEvent, unknown>;
   mouseover?: ITracker<MouseEvent, unknown>;
   mouseout?: ITracker<MouseEvent, unknown>;
}

export class DomElementMock implements IDomElement<HTMLElementMock> {
   public id!: string;
   public readonly offset = { left: 0, top: 0 };
   public nativeElement!: HTMLElementMock;
   public marginLeft = 0;
   public marginRight = 0;
   public marginTop = 0;
   public marginBottom = 0;
   public paddingLeft = 0;
   public paddingRight = 0;
   public paddingTop = 0;
   public paddingBottom = 0;
   public borderLeft = 0;
   public borderRight = 0;
   public borderBottom = 0;
   public borderTop = 0;
   public height!: number;
   public width!: number;
   public scrollTop = 0;
   public scrollLeft = 0;
   public firstChild!: IDomElement<HTMLElementMock>;
   public children: IDomElement<HTMLElementMock>[] = [];
   public hasXOverflow!: boolean;
   public hasYOverflow!: boolean;
   public isVisible!: boolean;
   public innerHtml!: string;
   public enabled!: boolean;
   public mousedown!: ITracker<MouseEvent, unknown>;
   public mousemove!: ITracker<MouseEvent, unknown>;
   public mouseover!: ITracker<MouseEvent, unknown>;
   public mouseout!: ITracker<MouseEvent, unknown>;

   constructor(properties?: IDomElementMockProperties) {
      Object.assign(this, properties);
   }

   public get outerOffset(): IPosition {
      const offset = this.offset;
      offset.top -= this.marginTop;
      offset.left -= this.marginLeft;
      return offset;
   }

   public get outerHeightWithMargin(): number {
      return this.outerHeight + this.marginTop + this.marginBottom;
   }

   public set outerHeightWithMargin(value: number) {
      this.height =
         value -
         this.paddingTop -
         this.paddingBottom -
         this.borderTop -
         this.borderBottom -
         this.marginTop -
         this.marginBottom;
   }

   public get outerHeight(): number {
      return this.innerHeight + this.borderTop + this.borderBottom;
   }
   public set outerHeight(value: number) {
      this.height =
         value -
         this.paddingTop -
         this.paddingBottom -
         this.borderTop -
         this.borderBottom;
   }

   public get outerWidthWithMargin(): number {
      return this.outerWidth + this.marginLeft + this.marginRight;
   }
   public set outerWidthWithMargin(value: number) {
      this.width =
         value -
         this.paddingLeft -
         this.paddingRight -
         this.borderLeft -
         this.borderRight -
         this.marginLeft -
         this.marginRight;
   }

   public get outerWidth(): number {
      return this.innerWidth + this.borderLeft + this.borderRight;
   }
   public set outerWidth(value: number) {
      this.width =
         value -
         this.paddingLeft -
         this.paddingRight -
         this.borderLeft -
         this.borderRight;
   }

   public get innerHeight(): number {
      return this.height + this.paddingTop + this.paddingBottom;
   }

   public set innerHeight(value: number) {
      this.height = value - this.paddingTop - this.paddingBottom;
   }

   public get innerWidth(): number {
      return this.width + this.paddingLeft + this.paddingRight;
   }

   public set innerWidth(value: number) {
      this.width = value - this.paddingLeft - this.paddingRight;
   }

   public get left(): number {
      return this.offset.left;
   }

   public set left(value: number) {
      this.offset.left = value;
   }

   public get top(): number {
      return this.offset.top;
   }

   public set top(value: number) {
      this.offset.top = value;
   }

   public readonly addClass = jest.fn();
   public readonly removeClass = jest.fn();
   public readonly hasClass = jest.fn();
   public readonly find = jest.fn();
   public readonly findAll = jest.fn();
   public readonly getParent = jest.fn();
   public readonly getCssAttributeValue = jest.fn();
   public readonly setCssAttributeValues = jest.fn();
   public readonly isOutSide = jest.fn();
   public readonly getAttribute = jest.fn();
   public readonly setAttribute = jest.fn();
   public readonly scrollLeftToEnd = jest.fn();
   public readonly scrollTopToEnd = jest.fn();
   public readonly addChild = jest.fn();
   public readonly remove = jest.fn();
   public readonly clearContent = jest.fn();
}
