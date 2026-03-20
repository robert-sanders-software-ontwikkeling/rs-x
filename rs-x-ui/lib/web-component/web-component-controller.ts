import {
   Assertion,
   Type,
} from '@rs-x/core';
import { Subscription } from 'rxjs';
import { IDomElementData } from '../dom-element-data/dom-element-data.interface';
import { IDomQuery } from '../dom-query/dom-query.interface';
import { IDomService } from '../dom-service';
import { IResizeObserverEntry } from '../resize/resize-observer-entry.interface';
import { IResizeObserverService } from '../resize/resize-observer-service.interface';
import { IBindingManagerFactory } from './binding/binding-manager.factory.type';
import { IBindingManager } from './binding/binding-manager.interface';
import { IBindingQueue } from './binding/binding-queue.interface';
import { IReflectedAttribute } from './binding/interfaces';
import { IViewChildContext } from './decorators/view-child/view-child-context.interface';
import { IEventManagerFactory } from './event-manager/event-manager.factory.type';
import { IEventManager } from './event-manager/event-manager.interface';
import {
   componentPropertyName,
   ICustomElementConnector,
   IDomContentBuilder,
   IStyle,
   IWebComponentController,
   IWebComponentCoreServices,
   IWebComponentThemeManager,
   WebComponentElementConstructor,
} from './interfaces';
import { ISlotCHangeObserverFactory } from './slot-change-observer/slot-change-observer.factory.type';
import { ISlotChangeObserver } from './slot-change-observer/slot-change-observer.interface';

export class WebComponentController implements IWebComponentController {
   public readonly customElementConnector: ICustomElementConnector;
   private readonly _eventManagerFactory: IEventManagerFactory;
   private readonly _bindingManagerFactory: IBindingManagerFactory;
   private _eventManager!: IEventManager | null;
   private _bindingManager!: IBindingManager | null;
   protected readonly bindingQueue: IBindingQueue;
   protected readonly elementData: IDomElementData;
   protected readonly domQuery: IDomQuery;
   protected readonly domService: IDomService;
   protected readonly contentContainerElement: Element | ShadowRoot;
   private _rebuildContentSubscription!: Subscription | null;
   private _boundSubscription!: Subscription | null;
   private _attributeReflectedSubscription!: Subscription | null;
   private _isAttached = false;

   protected readonly themeManager: IWebComponentThemeManager;
   protected _contentBuilder: IDomContentBuilder | null;
   private readonly _styles!: string;
   private readonly _slotCHangeObserverFactory: ISlotCHangeObserverFactory;
   private _slotChangeObserver!: ISlotChangeObserver | null;
   private readonly _resizeObserverService: IResizeObserverService;
   private readonly _viewChildContext: IViewChildContext;
   private _themeChangedSubscription!: Subscription | null;
   private _resizedSubscription!: Subscription | null;
   private _themeStyleElement!: HTMLStyleElement | null;
   private _customStyle!: IStyle;
   private _content: Node[] = [];
   private _parent!: Element | null;

   constructor(services: IWebComponentCoreServices) {
      this.customElementConnector = services.customElementConnector;
      this.elementData = services.domElementData;

      this._bindingManagerFactory = services.bindingManagerFactory;
      this._eventManagerFactory = services.eventManagerFactory;
      this._slotCHangeObserverFactory = services.slotCHangeObserverFactory;

      this.bindingQueue = services.bindingQueue;
      this.domQuery = services.domQuery;
      this.domService = services.domService;
      this.contentContainerElement = this.getContentContainer(services.customElementConnector);

      this._viewChildContext = services.viewChildContext;
      this.domQuery = services.domQuery;
      this._contentBuilder = services.templateBuilder;
      this.themeManager = services.themeManager;

      this._resizeObserverService = services.resizeObserverService;
      if (services.styles) {
         this._styles = invisibleCss.concat(
            Array.isArray(services.styles)
               ? services.styles.join('')
               : services.styles
         );
      }
   }

   public get bindingManager(): IBindingManager | null {
      return this._bindingManager;
   }

   public get eventManager(): IEventManager | null {
      return this._eventManager;
   }

   public get isAttached(): boolean {
      return this._isAttached;
   }

   public get parent(): Element {
      if (!this._parent) {
         this._parent = this.domQuery.getParent(
            (this.contentContainerElement as ShadowRoot).host
               ? (this.contentContainerElement as ShadowRoot).host
               : this.contentContainerElement
         ) as Element;
      }
      return this._parent;
   }

   public get content(): readonly Node[] {
      return this._content;
   }

   public get visible(): boolean {
      return !!(
         this.customElementConnector.offsetWidth ||
         this.customElementConnector.offsetHeight ||
         this.customElementConnector.getClientRects().length
      );
   }

   public set visible(value: boolean) {
      if (value) {
         this.customElementConnector.classList.remove(invisibleClassName);
      } else if (!this.customElementConnector.classList.contains(invisibleClassName)) {
         this.customElementConnector.classList.add(invisibleClassName);
      }
   }

   public get customStyle(): IStyle {
      return this._customStyle;
   }

   public set customStyle(value: IStyle) {
      if (this._customStyle && this._customStyle.id) {
         this.removeStyle(this._customStyle.id);
      }
      this._customStyle = value;
      if (value) {
         this.addStyle(value);
      }
   }

   public attach(): void {
      if (this.isAttached) {
         return;
      }

      const bindingManager = this._bindingManagerFactory.create(
         this.customElementConnector
      ).instance;
      this._bindingManager = bindingManager
      this._eventManager = this._eventManagerFactory.create({
         element: this.customElementConnector,
         context: this.customElementConnector.customElement,
      }).instance;

      this.elementData.register(
         this.customElementConnector,
         componentPropertyName,
         this.customElementConnector.customElement
      );

      this.initialize();
      this.registerBindings();
      this.setStyle();
      this.watchForThemeChange();

      this._boundSubscription = bindingManager.bound.subscribe(
         this.emitBound
      );

      this._attributeReflectedSubscription =
         bindingManager.attributeReflected.subscribe(
            this.emitAttributeReflected
         );

      this._rebuildContentSubscription =
         bindingManager.rebuildContent.subscribe(this.rebuildContent);

      this._isAttached = true;
   }

   public detach(): void {
      if (!this.isAttached) {
         return;
      }

      this.stopWatchForThemeChange();
      this.stopTrackResizing();
      this._viewChildContext.clearViewChildren(this);

      this.elementData.unregister(this.customElementConnector);
      this._boundSubscription?.unsubscribe();
      this._attributeReflectedSubscription?.unsubscribe();
      this._rebuildContentSubscription?.unsubscribe();
      this._rebuildContentSubscription = null;
      this._boundSubscription = null;
      this._attributeReflectedSubscription = null;

      this._bindingManagerFactory.release(this.customElementConnector);
      this._bindingManager = null;
      this._eventManagerFactory.release(this.customElementConnector);
      this._eventManager = null;

      this._isAttached = false;
   }

   public startTrackResizing(): void {
      this._resizeObserverService.observe(this.customElementConnector);
      this._resizedSubscription = this._resizeObserverService.resized.subscribe(
         this.emitResized
      );
   }

   public stopTrackResizing(): void {
      if (this._resizedSubscription) {
         this._resizedSubscription.unsubscribe();
         this._resizeObserverService.unobserve(this.customElementConnector);
      }
      this._resizedSubscription = null;
   }

   public addStyle(style: IStyle): HTMLStyleElement | null {

      Assertion.assertNotNullOrEmpty(style.id, 'style.id');

      this.removeStyle(style.id);
      const trimmedCss = style.css ? style.css.trim() : null;
      if (!Type.isEmpty(trimmedCss)) {
         const styleElement =  this.domService.createElement<HTMLStyleElement>('style').nativeElement;
         this.addShadowDomStyle(style.id, styleElement, trimmedCss);
         return styleElement;
      }
      return null;
   }

   public removeStyle(id: string): void {
      if (id) {
         const element = this.contentContainerElement.querySelector(
            `style#${id}`
         );
         if (element) {
            this.contentContainerElement.removeChild(element);
         }
      }
   }

   public buildContent(): void {
      this._content = this.createContent();
      this._content.forEach((contentNode) => {
         this.contentContainerElement.appendChild(contentNode);
      });

      this._slotChangeObserver = this._slotCHangeObserverFactory.create(
         this.customElementConnector
      ).instance;

      Assertion.assertNotNullOrUndefined(this._slotChangeObserver, '_slotChangeObserver');
      this._slotChangeObserver.startWatching(this._content as Element[]);
   }

   public async attributeChanged(
      attributeName: string,
      newValue: unknown,
      oldValue: unknown
   ): Promise<void> {

       Assertion.assertNotNullOrUndefined(this.bindingManager, 'bindingManager');
      // If the change is caused because of binding we already setting the property
      // So we don't want to set it again
      if (!this.bindingQueue.isBinding) {
         await this.bindingManager.setPropertyFromAttribute(
            attributeName,
            newValue,
            oldValue
         );
      }
   }

   public emitEvent(eventName: string, e?: unknown): void {
      Assertion.assertNotNullOrUndefined(this.eventManager, 'eventManager');
      // If the change is caused because of binding we already setting the proper
      this.eventManager.emitEvent(this.customElementConnector.customElement, eventName, e);
   }

   public querySelector(selector: string): Element | null {

      Assertion.assertNotNullOrUndefined(this.contentContainerElement, 'contentContainerElement');
      return this.contentContainerElement.querySelector(selector);
   }

   protected getEventElements(): Element[] {
      return this.domQuery.getElements(this.content);
   }

   protected createContent(): Node[] {
      return this._contentBuilder?.buildContent() ?? [];
   }

   protected getContentContainer(element: Element): Element | ShadowRoot {
      return element.shadowRoot ? element.shadowRoot : element;
   }

   protected disposeContent(): void {
      this._slotChangeObserver?.stopWatching();
      this._slotCHangeObserverFactory.release(this.customElementConnector);
      this._slotChangeObserver = null;
      this.content.forEach((contentNode) => {
         this.contentContainerElement.removeChild(contentNode);
      });
      this.bindingManager?.detachBindings();
      this.eventManager?.unbindAllEvents();
      this._parent = null;
   }

   protected registerBindings(): void {

      Assertion.assertNotNullOrUndefined(this.bindingManager, 'this.bindingManager');
         Assertion.assertNotNullOrUndefined(this.eventManager, 'this.eventManager');
      this.bindingQueue.push({
         bindingManager: this.bindingManager,
         eventManager: this.eventManager,
         content: [this.customElementConnector, ...this.content],
         eventElements: this.getEventElements(),
      });
   }

   protected initialize(): void {
      return;
   }

   protected rebuildContent = () => {
      this.detach();
      return this.attach();
   };

   protected emitBound = (): void => {
      this.emitEvent('bound');
   };

   protected emitAttributeReflected = (
      reflectedAttribute: IReflectedAttribute
   ): void => {
      this.emitEvent('attributeReflected', reflectedAttribute);
   };

   private watchForThemeChange(): void {
      this._themeChangedSubscription = this.themeManager.themeChanged.subscribe(
         this.setTheme
      );
   }

   private stopWatchForThemeChange(): void {
      this._themeChangedSubscription?.unsubscribe();
      this._themeChangedSubscription = null;
   }

   private addShadowDomStyle(
      id: string,
      style: HTMLStyleElement,
      trimmedCss: string
   ): void {
      if (!Type.isEmpty(id)) {
         style.id = id;
      }
      style.textContent = trimmedCss;
      const lastStyleElement =
         this.contentContainerElement.querySelectorAll('style')?.[0];
      if (lastStyleElement) {
         this.contentContainerElement.insertBefore(
            style,
            lastStyleElement.nextSibling
         );
      } else {
         this.contentContainerElement.insertBefore(
            style,
            this.contentContainerElement.children?.[0]
         );
      }
   }

   private emitResized = (resizeEntries: IResizeObserverEntry[]) => {
      const resizeEntry = resizeEntries.find((e) => e.target === this.customElementConnector);
      if (resizeEntry) {
         this.emitEvent('resized', resizeEntry);
      }
   };

   private setTheme = () => {
      const theme = this.themeManager.getComponentTheme(
         this.customElementConnector.customElement
            .constructor as WebComponentElementConstructor
      );
      if (!theme) {
         return;
      }
      if (this._themeStyleElement) {
         this._themeStyleElement.textContent = theme;
      } else {
         this._themeStyleElement = this.addStyle({
            id: 'theme',
            css: theme,
         });
      }
   };

   private setStyle(): void {
      if (this._styles) {
         this.addStyle({
            id: 'componentStyle',
            css: this._styles,
         });
      }
      this.setTheme();
   }
}

const invisibleCss = `:host(.invisible) { display:none;}`;
const invisibleClassName = 'invisible';
