import { ITracker, Type } from '@rs-x/core';

import { IPosition } from '../align-to/position.interface';
import { IDomElement } from './dom-element.interface';
import { IDomWindow } from '../dom-window';
import { MouseDownEvent } from '../events/mouse-down-event';
import { MouseMoveEvent } from '../events/mouse-move-event';
import { MouseOutEvent } from '../events/mouse-out-event';
import { MouseOverEvent } from '../events/mouse-over-event';

export class DomElement<T extends HTMLElement | SVGElement = HTMLElement>
   implements IDomElement<T>
{
   private _mousedown!: ITracker<MouseEvent, unknown>;
   private _mousemove!: ITracker<MouseEvent, unknown>;
   private _mouseover!: ITracker<MouseEvent, unknown>;
   private _mouseout!: ITracker<MouseEvent, unknown>;

   constructor(
      protected readonly _window: IDomWindow,
      protected readonly _element: T
   ) {}

   public get id(): string {
      return this.getAttribute('id') ?? '';
   }

   public set id(value: string) {
      this.setAttribute('id', value);
   }

   public get isVisible(): boolean {
      return !!(
         this.innerWidth ||
         this.innerHeight ||
         this._element.getClientRects().length
      );
   }

   public get enabled(): boolean {
      return this._element.classList.contains('disabled');
   }

   public set enabled(value: boolean) {
      if (value) {
         this._element.classList.remove('disabled');
      } else {
         this._element.classList.add('disabled');
      }
   }

   public get position(): IPosition {
      const { top, left } = this._element.getBoundingClientRect();
      const { marginTop, marginLeft } = window.getComputedStyle(this._element);
      return {
         top: top - parseInt(marginTop, 10),
         left: left - parseInt(marginLeft, 10),
      };
   }

   public get nativeElement(): T {
      return this._element;
   }

   public get left(): number {
      return this.position.left;
   }

   public set left(value: number) {
      this._element.style.left = `${value}px`;
   }

   public get top(): number {
      return this.position.top;
   }

   public set top(value: number) {
      this._element.style.top = `${value}px`;
   }

   public get height(): number {
      return this._element.getBoundingClientRect().height;
   }

   public set height(value: number) {
      this._element.style.height = `${value}px`;
   }

   public get width(): number {
      return this._element.getBoundingClientRect().width;
   }

   public set width(value: number) {
      this._element.style.width = `${value}px`;
   }

   public get offset(): IPosition {
      const box = this._element.getBoundingClientRect();
      return {
         top: box.top + this._window.scrollX - this._window.clientTop,
         left: box.left + this._window.scrollY - this._window.clientLeft,
      };
   }

   public get marginLeft(): number {
      return parseInt(this._element.style.marginLeft, 10);
   }

   public set marginLeft(value: number) {
      this._element.style.marginLeft = `${value}px`;
   }

   public get marginRight(): number {
      return parseInt(this._element.style.marginRight, 10);
   }

   public set marginRight(value: number) {
      this._element.style.marginRight = `${value}px`;
   }

   public get marginTop(): number {
      return parseInt(this._element.style.marginTop, 10);
   }

   public set marginTop(value: number) {
      this._element.style.marginTop = `${value}px`;
   }

   public get marginBottom(): number {
      return parseInt(this._element.style.marginBottom, 10);
   }

   public set marginBottom(value: number) {
      this._element.style.marginBottom = `${value}px`;
   }

   public get paddingLeft(): number {
      return parseInt(this._element.style.paddingLeft, 10);
   }

   public set paddingLeft(value: number) {
      this._element.style.paddingLeft = `${value}px`;
   }

   public get paddingRight(): number {
      return parseInt(this._element.style.paddingRight, 10);
   }

   public set paddingRight(value: number) {
      this._element.style.paddingRight = `${value}px`;
   }

   public get paddingTop(): number {
      return parseInt(this._element.style.paddingTop, 10);
   }

   public set paddingTop(value: number) {
      this._element.style.paddingTop = `${value}px`;
   }

   public get paddingBottom(): number {
      return parseInt(this._element.style.paddingTop, 10);
   }

   public set paddingBottom(value: number) {
      this._element.style.paddingBottom = `${value}px`;
   }

   public get borderLeft(): number {
      return parseInt(this._element.style.borderLeft, 10);
   }

   public set borderLeft(value: number) {
      this._element.style.borderLeft = `${value}px`;
   }

   public get borderRight(): number {
      return parseInt(this._element.style.borderRight, 10);
   }

   public set borderRight(value: number) {
      this._element.style.borderRight = `${value}px`;
   }

   public get borderTop(): number {
      return parseInt(this._element.style.borderTop, 10);
   }

   public set borderTop(value: number) {
      this._element.style.borderTop = `${value}px`;
   }

   public get borderBottom(): number {
      return parseInt(this._element.style.borderBottom, 10);
   }

   public set borderBottom(value: number) {
      this._element.style.borderBottom = `${value}px`;
   }

   public get outerOffset(): IPosition {
      const offset = this.offset;
      offset.top -= this.marginTop;
      offset.left -= this.marginLeft;
      return offset;
   }

   public get innerHeight(): number {
      return this._element.clientHeight;
   }

   public set innerHeight(value: number) {
      this._element.style.height = `${value}px`;
   }

   public get innerWidth(): number {
      return this._element.clientWidth;
   }

   public set innerWidth(value: number) {
      this._element.style.width = `${value}px`;
   }

   public get outerHeight(): number {
      return this._element.getBoundingClientRect().height;
   }

   public set outerHeight(value: number) {
      this._element.style.height = `${
         value -
         this.borderTop -
         this.borderBottom -
         this.paddingTop -
         this.paddingBottom
      }px`;
   }

   public get outerHeightWithMargin(): number {
      return this.outerHeight + this.marginTop + this.marginBottom;
   }

   public set outerHeightWithMargin(value: number) {
      this._element.style.height = `${
         value -
         this.borderTop -
         this.borderBottom -
         this.paddingTop -
         this.paddingBottom -
         this.marginTop -
         this.marginBottom
      }px`;
   }

   public get outerWidth(): number {
      return this._element.getBoundingClientRect().width;
   }

   public set outerWidth(value: number) {
      this._element.style.width = `${
         value -
         this.borderLeft -
         this.borderRight -
         this.paddingLeft -
         this.paddingRight
      }px`;
   }

   public get outerWidthWithMargin(): number {
      return this.outerWidth + this.marginLeft + this.marginRight;
   }

   public set outerWidthWithMargin(value: number) {
      this._element.style.width = `${
         value -
         this.borderLeft -
         this.borderRight -
         this.paddingLeft -
         this.paddingRight -
         this.marginLeft -
         this.marginRight
      }px`;
   }

   public get scrollTop(): number {
      return this._element.scrollTop;
   }

   public set scrollTop(value: number) {
      this._element.scrollTop = value;
   }

   public get scrollLeft(): number {
      return this._element.scrollLeft;
   }

   public set scrollLeft(value: number) {
      this._element.scrollLeft = value;
   }

   public get innerHtml(): string {
      return this._element.innerHTML;
   }

   public set innerHtml(value: string) {
      this._element.innerHTML = value;
   }

   public get hasXOverflow(): boolean {
      return this.innerWidth < this._element.scrollWidth;
   }

   public get hasYOverflow(): boolean {
      return this.innerHeight < this._element.scrollHeight;
   }

   public get children(): IDomElement<T>[] {
      return Array.from(this._element.children).map(
         (child) => new DomElement<T>(this._window, child as unknown as T)
      );
   }

   public get firstChild(): IDomElement<T> {
      return new DomElement<T>(
         this._window,
         this._element.firstChild as unknown as T
      );
   }

   public get mousedown(): ITracker<MouseEvent, unknown> {
      if (!this._mousedown) {
         this._mousedown = new MouseDownEvent(this._element);
      }
      return this._mousedown;
   }

   public get mousemove(): ITracker<MouseEvent, unknown> {
      if (!this._mousemove) {
         this._mousemove = new MouseMoveEvent(this._element);
      }
      return this._mousemove;
   }

   public get mouseout(): ITracker<MouseEvent, unknown> {
      if (!this._mouseout) {
         this._mouseout = new MouseOutEvent(this._element);
      }
      return this._mouseout;
   }

   public get mouseover(): ITracker<MouseEvent, unknown> {
      if (!this._mouseover) {
         this._mouseover = new MouseOverEvent(this._element);
      }
      return this._mouseover;
   }

   public clearContent(): void {
      this._element.innerHTML = '';
   }

   public setAttribute(name: string, value: string): void {
      this._element.setAttribute(name, value);
   }

   public getAttribute(name: string): string | null {
      return this._element.getAttribute(name);
   }

   public find(selector: string): IDomElement | null {

      const element = this._element.querySelector<HTMLElement>(selector);
      if(!element) {
         return null
      }
      return new DomElement(
         this._window,
         element
      );
   }

   public findAll(selector: string): IDomElement[] {
      return Array.from(this.nativeElement.querySelectorAll(selector)).map(
         (element) => new DomElement(this._window, element as HTMLElement)
      );
   }

   public isOutSide(selector: string, excludeSelectors?: string[]): boolean {
      if (Type.isEmpty(excludeSelectors)) {
         return !this._element.closest(selector);
      } else {
         return (
            !this._element.closest(selector) &&
            excludeSelectors.every((e) => !this._element.closest(e))
         );
      }
   }

   public addChild(child: IDomElement): void {
      this._element.append(child.nativeElement);
   }

   public remove(): void {
      this._element.remove();
   }

   public getParent(selector?: string): IDomElement {
      if (!selector) {
         return new DomElement(this._window, this._element.parentElement as HTMLElement);
      } else {
         return new DomElement(this._window, this._element.closest<HTMLElement>(selector)!);
      }
   }

   public getCssAttributeValue(cssAttributeName: string): string {
      return this._element.style[cssAttributeName];
   }

   public setCssAttributeValues(cssAttributes: Record<string, string>): void {
      Object.keys(cssAttributes).forEach(
         (key) => (this._element.style[key] = cssAttributes[key])
      );
   }

   public addClass(className: string): void {
      this._element.classList.add(className);
   }

   public removeClass(className: string): void {
      this._element.classList.remove(className);
   }

   public hasClass(className: string): boolean {
      return this._element.classList.contains(className);
   }

   public scrollLeftToEnd(): void {
      this.scrollLeft = this._element.scrollWidth;
   }

   public scrollTopToEnd(): void {
      this.scrollTop = this._element.scrollHeight;
   }
}
