import {
   ContainerModule,
} from '@rs-x/core';
import { Observable } from 'rxjs';

import { IBindingQueue } from './binding/binding-queue.interface';
import { ISlotBoundEventArgs } from './binding/interfaces';
import { IComponentMetadata } from './decorators/component/component-metadata.interface';
import { IViewChildContext } from './decorators/view-child/view-child-context.interface';
import { WebComponentController } from './web-component-controller';
import { IBindingManagerFactory } from './binding/binding-manager.factory.type';
import { IEventManagerFactory } from './event-manager/event-manager.factory.type';
import { ISlotCHangeObserverFactory } from './slot-change-observer/slot-change-observer.factory.type';
import { IEventManager } from './event-manager/event-manager.interface';
import { IBindingManager } from './binding/binding-manager.interface';
import { IResizeObserverEntry } from '../resize/resize-observer-entry.interface';
import { IDomElementData } from '../dom-element-data/dom-element-data.interface';
import { IDomQuery } from '../dom-query/dom-query.interface';
import { IResizeObserverService } from '../resize/resize-observer-service.interface';
import { IDecoratorValidationMetadata } from './decorators/decorator-validator.interface';
import { IDomService } from '../dom-service/dom-service.interface';

export interface ICustomElement<
   T extends ICustomElementController = ICustomElementController,
> {
   element: HTMLElement;
   controller: T;
   readonly parent: Element;
   readonly bound: Observable<void>;
   buildContent(): void;
   attach(element: Element): void;
   detach(): void;
   attributeChanged(
      attributeName: string,
      newValue: unknown,
      oldValue: unknown
   ): Promise<void>;
   querySelector(selector: string): Element | null;
}

export interface IWebComponentElement<
   T extends IWebComponentController = IWebComponentController,
> extends ICustomElement<T> {
   visible: boolean;
   customStyle: IStyle;
   readonly resized: Observable<IResizeObserverEntry[]>;
   readonly slotBound: Observable<ISlotBoundEventArgs>;
   readonly slotAssigned: Observable<HTMLSlotElement>;
}

export interface ICustomElementController {
   readonly customElementConnector: ICustomElementConnector;
   readonly bindingManager: IBindingManager | null;
   readonly eventManager: IEventManager | null;
   readonly parent: Element;
   readonly isAttached: boolean;
   content: readonly Node[];
   buildContent(): void;
   attach(): void;
   detach(): void;
   attributeChanged(
      attributeName: string,
      oldValue: unknown,
      newValue: unknown
   ): Promise<void>;
   emitEvent(eventName: string, e: unknown): void;
   querySelector(selector: string): Element | null;
}

export interface IControllerFactory<T extends ICustomElementController> {
   create(coreServices: ICustomElementCoreServices): T;
}

export type IWebComponentControllerFactory =
   IControllerFactory<IWebComponentController>;

export interface ICustomElementCoreServices {
   bindingManagerFactory: IBindingManagerFactory;
   bindingQueue: IBindingQueue;
   eventManagerFactory: IEventManagerFactory;
   customElementConnector: ICustomElementConnector;
   domElementData: IDomElementData;
   domQuery: IDomQuery;
}

export interface IWebComponentCoreServices extends ICustomElementCoreServices {
   resizeObserverService: IResizeObserverService;
   themeManager: IWebComponentThemeManager;
   slotCHangeObserverFactory: ISlotCHangeObserverFactory;
   styles: string | string[];
   templateBuilder: IDomContentBuilder | null;
   viewChildContext: IViewChildContext;
   domService: IDomService;
}

export interface IWebComponentController extends ICustomElementController {
   visible: boolean;
   customStyle: IStyle;
   startTrackResizing(): void;
   stopTrackResizing(): void;
   addStyle(style: IStyle): void;
   removeStyle(id: string): void;
}

export interface IDomContentBuilder {
   buildContent(): Node[];
}

export interface IStyle {
   id?: string;
   css: string;
}

export interface IStylable extends HTMLElement {
   customStyle: IStyle;
   addStyle(style: IStyle): void;
   removeStyle(id: string): void;
}

export interface ITheme {
   componentStyles: Map<WebComponentElementConstructor, string>;
   themeCssFile: string;
}

export interface IWebComponentThemeManager {
   theme: string;
   readonly themes: string[];
   readonly themeChanged: Observable<void>;
   registerTheme(name: string, componentTheme: ITheme): void;
   unregisterTheme(name: string): void;
   getComponentTheme(
      componentType: WebComponentElementConstructor
   ): string | undefined;
}

export interface IWebComponentElementControllerFactory {
   create(
      element: ICustomElementConnector,
      template: string,
      styles: string | string[],
      factoryToken: WebComponentControllerFactoryToken
   ): ICustomElementController;
}

export interface IWebComponentServices {
   readonly eventManagerFactory: IEventManagerFactory;
   readonly bindingManagerFactory: IBindingManagerFactory;
   readonly slotChangeObserverFactory: ISlotCHangeObserverFactory;
   readonly themeManager: IWebComponentThemeManager;
   readonly resizeObserverService: IResizeObserverService;
   readonly domQuery: IDomQuery;
   readonly elementContentBuilder: IDomContentBuilder;
}

export const bindingDataPropertyName = Symbol('bindingData');
export const componentPropertyName = Symbol('component');

export interface IComponentRegistry {
   readonly attaching: Observable<ICustomElement<ICustomElementController>>;
   readonly ready: Observable<ICustomElement<ICustomElementController>>;
   registerWebComponent(
      tagName: string,
      template: string,
      styles: string | string[],
      webComponentType: WebComponentElementConstructor,
      factoryToken: WebComponentControllerFactoryToken
   ): void;
}

export interface ICustomElementConnector<
   CT extends ICustomElementController = ICustomElementController,
   ET extends ICustomElement<CT> = ICustomElement<CT>,
> extends HTMLElement {
   customElement: ET;
}

export type IDirectiveHtmlElement<
   T extends ICustomElementController = ICustomElementController,
> = ICustomElementConnector<T, ICustomElement<T>>;

export interface IRegisteredComponents {
   readonly components: [WebComponentElementConstructor, IComponentMetadata][];
   getComponentInfo(
      webComponentType: WebComponentElementConstructor
   ): IComponentMetadata | undefined;
}

export interface IApplicationConfig {
   themes?: Record<string, ITheme>;
   modules?: ContainerModule[];
   decoratorValidationConfig?: IDecoratorValidationMetadata[];
}

export interface IBootstrapper {
   bootstrap(config?: IApplicationConfig): Promise<void>;
   registerWebComponents(): void;
}

export type WebComponentElementConstructor = new (
   ...args: unknown[]
) => IWebComponentElement<IWebComponentController>;
export type WebComponentControllerConstructor = new (
   service: IWebComponentCoreServices
) => WebComponentController;
export type WebComponentControllerFactoryToken =
   | symbol
   | WebComponentControllerConstructor;
