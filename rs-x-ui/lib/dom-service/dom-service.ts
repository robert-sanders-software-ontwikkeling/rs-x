import { Inject, Injectable, Type } from '@rs-x/core';
import { ContentEditableElement } from '../content-editable-element/content-editable-element';
import { DomElement } from '../dom-element/dom-element';
import { IDomElement } from '../dom-element/dom-element.interface';
import { InputElement } from '../input-element/input-element';
import { IInputElement } from '../input-element/input-element.interface';
import { ISvgDomElement } from '../svg-dom-element/svg-dom-element.interface';

import { IDomWindow } from '../dom-window/dom-window.interface';
import { RsXUIInjectionTokens } from '../rx-x-ui.injection-tokens';
import { SvgDomElement } from '../svg-dom-element/svg-dom-element';
import { IDomService } from './dom-service.interface';

@Injectable()
export class DomService implements IDomService {
   private _body!: IDomElement;

   constructor(
      @Inject(RsXUIInjectionTokens.IDomWindow)
      private readonly _window: IDomWindow
   ) {}

   public setInterval(handler: TimerHandler, timeout?: number): number {
      return this._window.setInterval(handler, timeout);
   }

   public setTimeout(handler: TimerHandler, timeout?: number): number {
      return this._window.setTimeout(handler, timeout);
   }

   public clearInterval(handle?: number): void {
      this._window.clearInterval(handle);
   }

   public clearTimeout(handle?: number): void {
      this._window.clearTimeout(handle);
   }

   public get onResize(): (() => void) | null {
      return this._window.onresize;
   }

   public set onResize(value: () => void) {
      this._window.onresize = value;
   }

   public get scrollX(): number {
      return this._window.scrollX;
   }

   public set scrollX(value: number) {
      this._window.scrollX = value;
   }

   public get scrollY(): number {
      return this._window.scrollY;
   }

   public set scrollY(value: number) {
      this._window.scrollY = value;
   }

   public get windowWidth(): number {
      return this._window.width;
   }

   public get windowInnerWidth(): number {
      return this._window.innerWidth;
   }

   public get windowHeight(): number {
      return this._window.height;
   }

   public get windowInnerHeight(): number {
      return this._window.innerHeight;
   }

   public get hasInputWithFocus(): boolean {
      return !!document.activeElement && document.activeElement !== document.body;
   }

   public get body(): IDomElement {
      if (!this._body) {
         this._body = new DomElement(this._window, document.body);
      }
      return this._body;
   }

   public create(element: HTMLElement): IDomElement {
      return new DomElement(this._window, element);
   }

   public query<T extends HTMLElement | SVGElement = HTMLElement>(selector: string | HTMLElement): IDomElement<T> {
      if (selector === 'window') {
         return new DomElement(this._window, document.documentElement) as unknown as IDomElement<T>;
      }

      if (Type.isString(selector)) {
         return new DomElement(
            this._window,
            document.documentElement.querySelector<HTMLElement>(selector)!
         ) as unknown as IDomElement<T>;
      }

      return new DomElement(this._window, selector) as unknown as IDomElement<T>;
   }

   public createSvgElement(element?: SVGSVGElement): ISvgDomElement {
      if (element) {
         new SvgDomElement(this._window, element);
      }
      return new SvgDomElement(
         this._window,
         this._window.document.createElementNS(
            'http://www.w3.org/2000/svg',
            'svg'
         )
      );
   }

   public createElement<T  extends HTMLElement | SVGElement = HTMLElement>(tagName: string): IDomElement<T> {
      return new DomElement<T>(
         this._window,
         this._window.document.createElement(tagName) as unknown as T
      );
   }

   public createInputELement(element: HTMLInputElement): IInputElement {
      if (element.tagName.toLowerCase() === 'input') {
         return new InputElement(this._window, element);
      }
      return new ContentEditableElement(this._window, element);
   }

   public get mouseDown(): ((e: MouseEvent) => void) | null {
      return this._window.document.body.onmousedown;
   }

   public set mouseDown(value: (e: MouseEvent) => void) {
      this._window.document.body.onmousedown = value;
   }

   public get mouseUp(): ((e: MouseEvent) => void) | null {
      return this._window.document.body.onmouseup;
   }

   public set mouseUp(value: (e: MouseEvent) => void) {
      this._window.document.body.onmouseup = value;
   }

   public get mouseMove(): ((e: MouseEvent) => void) | null {
      return this._window.document.body.onmousemove;
   }

   public set mouseMove(value: (e: MouseEvent) => void) {
      this._window.document.body.onmousemove = value;
   }

   public get mouseLeave(): ((e: MouseEvent) => void) | null {
      return document.body.onmouseleave;
   }

   public set mouseLeave(value: (e: MouseEvent) => void) {
      this._window.document.body.onmouseleave = value;
   }

   public get mouseEnter(): ((e: MouseEvent) => void) | null {
      return this._window.document.body.onmouseenter;
   }

   public set mouseEnter(value: (e: MouseEvent) => void) {
      this._window.document.body.onmouseenter = value;
   }

   public get blur(): ((e: FocusEvent) => void) | null {
      return window.onblur;
   }

   public set blur(value: (e: FocusEvent) => void) {
      window.onblur = value;
   }
}
