import { IDomElement } from '../dom-element/dom-element.interface';
import { IDomService } from '../dom-service/dom-service.interface';

export interface IDomServiceMockProperties {
   windowHeight?: number;
   windowWidth?: number;
   windowInnerHeight?: number;
   windowInnerWidth?: number;
   scrollX?: number;
   scrollY?: number;
   body?: IDomElement<HTMLElement>;
   hasInputWithFocus?: boolean;
   mouseUp?: (e: MouseEvent) => void;
   mouseDown?: (e: MouseEvent) => void;
   mouseMove?: (e: MouseEvent) => void;
   mouseLeave?: (e: MouseEvent) => void;
   mouseEnter?: (e: MouseEvent) => void;
   blur?: (e: Event) => void;
   onResize?: () => void;
}

export class DomServiceMock implements IDomService {
   public windowHeight: number;
   public windowWidth: number;
   public windowInnerHeight: number;
   public windowInnerWidth: number;
   public scrollX = 0;
   public scrollY = 0;
   public body: IDomElement<HTMLElement>;
   public hasInputWithFocus: boolean;
   public mouseUp: (e: MouseEvent) => void;
   public mouseDown: (e: MouseEvent) => void;
   public mouseMove: (e: MouseEvent) => void;
   public mouseLeave: (e: MouseEvent) => void;
   public mouseEnter: (e: MouseEvent) => void;
   public blur: (e: Event) => void;
   public onResize: () => void;

   constructor(settings?: IDomServiceMockProperties) {
      Object.assign(this, settings);
   }

   public readonly setInterval = jest.fn();
   public readonly setTimeout = jest.fn();
   public readonly clearInterval = jest.fn();
   public readonly clearTimeout = jest.fn();
   public readonly query = jest.fn();
   public readonly create = jest.fn();
   public readonly createElement = jest.fn();
   public readonly createSvgElement = jest.fn();
   public readonly createInputELement = jest.fn();
}
