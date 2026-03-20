import { ContainerModule, InjectionContainer, overrideMultiInjectServices, RsXCoreInjectionTokens } from '@rs-x/core';
import { defaultIdentifierOwnerResolverList, RsXExpressionParserInjectionTokens, RsXExpressionParserModule, unloadRsXExpressionParserModule } from '@rs-x/expression-parser';
import { RsXUIInjectionTokens } from './rx-x-ui.injection-tokens';
import { BindingAttributeParser } from './web-component/binding/binding-attribute-parser';
import { BindingManagerFactory } from './web-component/binding/binding-manager.factory';
import { IBindingManagerFactory } from './web-component/binding/binding-manager.factory.type';
import { BindingQueue } from './web-component/binding/binding-queue';
import { IBindingQueue } from './web-component/binding/binding-queue.interface';
import { BindingsParser } from './web-component/binding/bindings-parser';
import {
   IBindingAttributeParser,
   IBindingCollection,
   IBindingsParser,
   ITextContentExpressionParser,
} from './web-component/binding/interfaces';
import { TextContentExpressionParser } from './web-component/binding/text-content-expression-parser';
import { Bootstrapper } from './web-component/bootstrapper';
import { ComponentRegistry } from './web-component/component-registry';
import { OutputContext } from './web-component/decorators/output/output-context';
import { IOutputContext } from './web-component/decorators/output/output-context.interface';
import { ViewChildContext } from './web-component/decorators/view-child/view-child-context';
import { IViewChildContext } from './web-component/decorators/view-child/view-child-context.interface';
import { IEventManagerFactory } from './web-component/event-manager/event-manager.factory.type';
import { EventManagerFactory } from './web-component/event-manager/event-mananager.factory';
import { EventObserver } from './web-component/event-manager/event-observer';
import { IEventObserver } from './web-component/event-manager/event-observer.interface';
import {
   IBootstrapper,
   IComponentRegistry,
   IRegisteredComponents,
   IWebComponentElementControllerFactory,
   IWebComponentThemeManager,
} from './web-component/interfaces';
import { RegisteredComponents } from './web-component/registered-components';
import { SlotChangeObserverFactory } from './web-component/slot-change-observer/slot-change-observer.factory';
import { ISlotCHangeObserverFactory } from './web-component/slot-change-observer/slot-change-observer.factory.type';
import { StructuralDirectiveRegistry } from './web-component/structural-directives/structural-directive-registry';
import { IStructuralDirectiveRegistry } from './web-component/structural-directives/structural-directive-registry.interface';
import { WebComponentElementControllerFactory } from './web-component/web-component-element-controller.factory';
import { WebComponentThemeManager } from './web-component/web-component-theme-manager';
import { BindingCollection } from './web-component/binding/binding-collection';

import { RepeaterDirectiveFactory } from './web-component/structural-directives/repeater/repeater-directive.factory';
import { IStructuralDirectiveFactory } from './web-component/structural-directives/repeater/repeater-directive.factory.interface';
import { IResizeObserverFactory } from './resize/resize-observer-factory.interface';
import { ResizeObserverFactory } from './resize/resize-observer-factory';
import { IResizeObserverService } from './resize/resize-observer-service.interface';
import { ResizeObserverService } from './resize/resize-observer';
import { IHTMLParser } from './html-parser/html-parser.interface';
import { HTMLParser } from './html-parser/html-parser';
import { DomQuery, IDomQuery } from './dom-query';
import { InputContext } from './web-component/decorators/input/input-context';
import { IInputContext } from './web-component/decorators/input/input-context.interface';
import { IElementRemovedObserver } from './element-removed-observer/element-removed-observer.interface';
import { ElementRemovedObserver } from './element-removed-observer/element-removed-observer';
import { IDomElementData } from './dom-element-data/dom-element-data.interface';
import { DomElementData } from './dom-element-data/dom-element-data';
import { IDomService } from './dom-service/dom-service.interface';
import { DomService } from './dom-service/dom-service';
import { IAlignToService } from './align-to/align-to-service.interface';
import { AlignToService } from './align-to/align-to.service';
import { ITemplatedElementFactories } from './template/templated-element.factories.type';
import { TemplatedElementFactories } from './template/templated-element.factories';
import { IDomElementFactory } from './dom-element/dom-element.factory.interface';
import { IDecoratorValidatorConfiguration } from './web-component/decorators/decorator-validator-configuration.interface';
import { DecoratorValidatorConfiguration } from './web-component/decorators/decorator-validator-configuration';
import { DecoratorValidator } from './web-component/decorators/decorator-validator';
import { IEventIdentifierResolver } from './web-component/event-manager/event-identifier-resolver.interface';
import { EventIdentifierResolver } from './web-component/event-manager/event-identifier-resolver';
import { DomIdentifierOwnerResolver } from './identifier-owner-resolver';

InjectionContainer.load(RsXExpressionParserModule);

export const RsXCoreUIModule = new ContainerModule((options) => {

   options
      .bind<IResizeObserverFactory>(
         RsXUIInjectionTokens.IResizeObserverFactory
      )
      .to(ResizeObserverFactory)
      .inSingletonScope();

   options
      .bind<IResizeObserverService>(
         RsXUIInjectionTokens.IResizeObserverService
      )
      .to(ResizeObserverService)
      .inSingletonScope();
   options
      .bind<IHTMLParser>(
         RsXUIInjectionTokens.IHTMLParser
      )
      .to(HTMLParser)
      .inSingletonScope();
   options
      .bind<IDomQuery>(
         RsXUIInjectionTokens.IDomQuery
      )
      .to(DomQuery)
      .inSingletonScope();
   options
      .bind<IInputContext>(RsXUIInjectionTokens.IInputContext)
      .to(InputContext)
      .inSingletonScope();
   options
      .bind<IElementRemovedObserver>(RsXUIInjectionTokens.IElementRemovedObserver)
      .to(ElementRemovedObserver)
      .inSingletonScope();
   options
      .bind<IDomElementData>(RsXUIInjectionTokens.IDomElementData)
      .to(DomElementData)
      .inSingletonScope();

   options
      .bind<IWebComponentElementControllerFactory>(
         RsXUIInjectionTokens.IWebComponentElementControllerFactory
      )
      .to(WebComponentElementControllerFactory)
      .inSingletonScope();
   options
      .bind<IWebComponentThemeManager>(
         RsXUIInjectionTokens.IWebComponentThemeManager
      )
      .to(WebComponentThemeManager)
      .inSingletonScope();
   options
      .bind<IBindingAttributeParser>(
         RsXUIInjectionTokens.IBindingAttributeParser
      )
      .to(BindingAttributeParser)
      .inSingletonScope();
   options
      .bind<IComponentRegistry>(RsXUIInjectionTokens.IComponentRegistry)
      .to(ComponentRegistry)
      .inSingletonScope();
   options
      .bind<IOutputContext>(RsXUIInjectionTokens.IOutputContext)
      .to(OutputContext)
      .inSingletonScope();
   options
      .bind<IViewChildContext>(RsXUIInjectionTokens.IViewChildContext)
      .to(ViewChildContext)
      .inSingletonScope();
   options
      .bind<IRegisteredComponents>(
         RsXUIInjectionTokens.IRegisteredComponents
      )
      .toConstantValue(RegisteredComponents.instance);
   options
      .bind<IStructuralDirectiveRegistry>(
         RsXUIInjectionTokens.IStructuralDirectiveRegistry
      )
      .toConstantValue(StructuralDirectiveRegistry.instance);
   options
      .bind<IBootstrapper>(RsXUIInjectionTokens.IBootstrapper)
      .to(Bootstrapper)
      .inSingletonScope();
   options
      .bind<IBindingQueue>(RsXUIInjectionTokens.IBindingQueue)
      .to(BindingQueue)
      .inSingletonScope();
   options
      .bind<ITextContentExpressionParser>(
         RsXUIInjectionTokens.ITextContentExpressionParser
      )
      .to(TextContentExpressionParser)
      .inSingletonScope();
   options
      .bind<IBindingsParser>(RsXUIInjectionTokens.IBindingsParser)
      .to(BindingsParser)
      .inSingletonScope();
   options
      .bind<IEventObserver>(RsXUIInjectionTokens.IEventObserver)
      .to(EventObserver)
      .inSingletonScope();
   options
      .bind<IBindingCollection>(RsXUIInjectionTokens.IBindingCollection)
      .to(BindingCollection)
      .inTransientScope();
   options
      .bind<IBindingManagerFactory>(
         RsXUIInjectionTokens.IBindingManagerFactory
      )
      .to(BindingManagerFactory)
      .inSingletonScope();
   options
      .bind<IEventManagerFactory>(RsXUIInjectionTokens.IEventManagerFactory)
      .to(EventManagerFactory)
      .inSingletonScope();
   options
      .bind<ISlotCHangeObserverFactory>(
         RsXUIInjectionTokens.ISlotCHangeObserverFactory
      )
      .to(SlotChangeObserverFactory)
      .inSingletonScope();
   options
      .bind<ITemplatedElementFactories>(
         RsXUIInjectionTokens.ITemplatedElementFactories
      )
      .to(TemplatedElementFactories)
      .inSingletonScope();
   options
      .bind<IStructuralDirectiveFactory>(
         RsXUIInjectionTokens.RepeaterDirectiveFactory
      )
      .to(RepeaterDirectiveFactory)
      .inSingletonScope();

   options
      .bind<IDomService>(RsXUIInjectionTokens.IDomService)
      .to(DomService)
      .inSingletonScope();

   options
      .bind<IAlignToService>(RsXUIInjectionTokens.IAlignToService)
      .to(AlignToService)
      .inTransientScope();



   options
      .bind<Window>(RsXUIInjectionTokens.IDomWindow)
      .toDynamicValue(() => {
         if (typeof window === 'undefined') {
            throw new Error('window is not available for SSR');
         }
         return window;
      });


   options
      .bind<IDomElementFactory>(RsXUIInjectionTokens.IDomElementFactory)
      .toDynamicValue(() => {
         if (typeof document === 'undefined') {
            throw new Error('document is not available for SSR');
         }
         return document;
      });

   options
      .bind<IDecoratorValidatorConfiguration>(RsXUIInjectionTokens.IDecoratorValidatorConfiguration)
      .toDynamicValue(() => new DecoratorValidatorConfiguration(DecoratorValidator.instance))
      .inSingletonScope();

   options
      .bind<IEventIdentifierResolver>(RsXUIInjectionTokens.IEventIdentifierResolver)
      .to(EventIdentifierResolver)
      .inSingletonScope();



   overrideMultiInjectServices(
      options,
      RsXExpressionParserInjectionTokens.IIdentifierOwnerResolverList,
      [
         {
            target: DomIdentifierOwnerResolver,
            token: RsXUIInjectionTokens.DomIdentifierOwnerResolver,
         },

         {
            target: EventIdentifierResolver,
            token: RsXUIInjectionTokens.IEventIdentifierResolver,
         },
         ...defaultIdentifierOwnerResolverList,
      ],
   );

});

export async function unloadRsXCoreUIModule(): Promise<void> {
   unloadRsXExpressionParserModule();

}


