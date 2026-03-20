import {
   ConstructorType,
   IErrorLog,
   Inject,
   Injectable,
   InjectionContainer,
   RsXCoreInjectionTokens,
} from '@rs-x/core';
import { Observable, Subject } from 'rxjs';
import { RsXUIInjectionTokens } from '../rx-x-ui.injection-tokens';
import { IInputContext } from './decorators/input/input-context.interface';
import { IBindingQueue } from './binding/binding-queue.interface';
import {
   IComponentRegistry,
   ICustomElement,
   ICustomElementController,
   ICustomElementConnector,
   IWebComponentElementControllerFactory,
   WebComponentControllerFactoryToken,
   WebComponentElementConstructor,
} from './interfaces';
import { IStructuralDirectiveRegistry } from './structural-directives/structural-directive-registry.interface';

type ControllerFactoryMethod = (
   element: ICustomElementConnector,
   factoryToken: WebComponentControllerFactoryToken,
   template: string,
   styles: string | string[]
) => ICustomElementController;

@Injectable()
export class ComponentRegistry implements IComponentRegistry {
   private readonly _attaching = new Subject<
      ICustomElement<ICustomElementController>
   >();
   private readonly _attached = new Subject<
      ICustomElement<ICustomElementController>
   >();
   private readonly _ready = new Subject<
      ICustomElement<ICustomElementController>
   >();

   constructor(
      @Inject(RsXUIInjectionTokens.IWebComponentElementControllerFactory)
      private readonly _webComponentElementControllerFactory: IWebComponentElementControllerFactory,
      @Inject(RsXUIInjectionTokens.IStructuralDirectiveRegistry)
      private readonly _structuralDirectiveRegistry: IStructuralDirectiveRegistry,
      @Inject(RsXUIInjectionTokens.IBindingQueue)
      private readonly _bindingQueue: IBindingQueue,
      @Inject(RsXCoreInjectionTokens.IErrorLog)
      private readonly _errorLog: IErrorLog
   ) {}

   public get attaching(): Observable<
      ICustomElement<ICustomElementController>
   > {
      return this._attaching;
   }

   public get attached(): Observable<ICustomElement<ICustomElementController>> {
      return this._attached;
   }

   public get ready(): Observable<ICustomElement<ICustomElementController>> {
      return this._ready;
   }

   public registerWebComponent(
      tagName: string,
      template: string,
      styles: string | string[],
      webComponentType: WebComponentElementConstructor,
      factoryToken: WebComponentControllerFactoryToken
   ): void {
      const connectorConstructor = this.createWebComponentConnectorConstructor(
         template,
         styles,
         webComponentType,
         factoryToken,
         this,
         this._structuralDirectiveRegistry,
         this._errorLog
      );
      window.customElements.define(tagName, connectorConstructor);
   }

   private createWebComponentConnectorConstructor(
      template: string,
      styles: string | string[],
      webComponentType: WebComponentElementConstructor,
      factoryToken: WebComponentControllerFactoryToken,
      componentRegistry: ComponentRegistry,
      structuralDirectiveRegistry: IStructuralDirectiveRegistry,
      errorLog: IErrorLog
   ): ConstructorType<HTMLElement> {
      return this.createConnectorConstructor(
         HTMLElement,
         webComponentType,
         this.createWebComponentController,
         factoryToken,
         componentRegistry,
         structuralDirectiveRegistry,
         errorLog,
         template,
         styles
      );
   }

   private createWebComponentController = (
      element: ICustomElementConnector,
      factoryToken: WebComponentControllerFactoryToken,
      template: string,
      styles: string | string[]
   ): ICustomElementController => {
      return this._webComponentElementControllerFactory.create(
         element,
         template,
         styles,
         factoryToken
      );
   };

   private createConnectorConstructor(
      baseElementType: ConstructorType<HTMLElement>,
      customElementType: ConstructorType<ICustomElement>,
      createController: ControllerFactoryMethod,
      factoryToken: WebComponentControllerFactoryToken,
      componentRegistry: ComponentRegistry,
      structuralDirectiveRegistry: IStructuralDirectiveRegistry,
      errorLog: IErrorLog,
      template: string,
      styles: string | string[]
   ): ConstructorType<HTMLElement> {
      class CustomElementConnector extends baseElementType {
         public readonly customElement: ICustomElement;

         constructor() {
            super();
            this.attachShadow({ mode: 'open' });
            structuralDirectiveRegistry.registerContext(this.shadowRoot!);

            this.customElement = new customElementType();
            this.customElement.controller = createController(
               this ,
               factoryToken,
               template,
               styles
            );
            this.customElement.buildContent();
         }

         public static get observedAttributes(): readonly string[] {
            return InjectionContainer.get<IInputContext>(
               RsXUIInjectionTokens.IInputContext
            ).getObservedAttributes(customElementType);
         }

         public connectedCallback(): void {
            componentRegistry._attaching.next(this.customElement);
            this.customElement.attach(this);
            componentRegistry._attached.next(this.customElement);

            queueMicrotask(() => {
               componentRegistry._bindingQueue.bind();
               componentRegistry._ready.next(this.customElement);
            });
         }

         public disconnectedCallback(): void {
            this.customElement.detach();
         }

         public async attributeChangedCallback(
            attributeName: string,
            oldValue: unknown,
            newValue: unknown
         ): Promise<void> {
            try {
               await this.customElement.attributeChanged(
                  attributeName,
                  newValue,
                  oldValue
               );
            } catch (e) {
               errorLog.add({
                  message: `attributeChangedCallback failed for attribute ${attributeName}`,
                  exception: e as Error,
                  context: this,
               });
            }
         }
      }
      return CustomElementConnector;
   }
}
