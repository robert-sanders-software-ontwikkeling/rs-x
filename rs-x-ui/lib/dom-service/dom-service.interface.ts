import { IDomElement } from '../dom-element/dom-element.interface';
import {IInputElement} from '../input-element/input-element.interface'
import { ISvgDomElement } from '../svg-dom-element/svg-dom-element.interface';


export interface IDomService {
   scrollX: number;
   scrollY: number;
   windowHeight: number;
   windowWidth: number;
   windowInnerHeight: number;
   windowInnerWidth: number;
   body: IDomElement;
   hasInputWithFocus: boolean;
   mouseUp: ((e: MouseEvent) => void) | null;
   mouseDown: ((e: MouseEvent) => void) | null;
   mouseMove: ((e: MouseEvent) => void) | null;
   mouseLeave: ((e: MouseEvent) => void) | null;
   mouseEnter: ((e: MouseEvent) => void) | null;
   onResize: (() => void) | null;
   blur: ((e: FocusEvent) => void) | null;
   query<T  extends HTMLElement | SVGElement = HTMLElement>(selector: string | HTMLElement): IDomElement<T >;
   create(element: HTMLElement): IDomElement;
   createElement<T  extends HTMLElement | SVGElement = HTMLElement>(tagName: string): IDomElement<T>;
   createSvgElement(domElement?: SVGSVGElement): ISvgDomElement;
   createInputELement(element: Element): IInputElement;
   setInterval(handler: TimerHandler, timeout?: number): number;
   setTimeout(handler: TimerHandler, timeout?: number): number;
   clearInterval(handle?: number): void;
   clearTimeout(handle?: number): void;
}
