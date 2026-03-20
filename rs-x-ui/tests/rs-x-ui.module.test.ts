import { InjectionContainer } from '@rs-x/core';
import { DomElementData } from '../lib/dom-element-data/dom-element-data';
import { DomQuery } from '../lib/dom-query/dom-query';
import { ElementRemovedObserver } from '../lib/element-removed-observer/element-removed-observer';
import { HTMLParser } from '../lib/html-parser';
import { ResizeObserverService } from '../lib/resize/resize-observer';
import { ResizeObserverFactory } from '../lib/resize/resize-observer-factory';
import { RsXCoreUIModule } from '../lib/rs-x-ui.module';
import { RsXUIInjectionTokens } from '../lib/rx-x-ui.injection-tokens';
import { TemplatedElementFactories } from '../lib/template/templated-element.factories';
import { BindingAttributeParser } from '../lib/web-component/binding/binding-attribute-parser';
import { BindingManagerFactory } from '../lib/web-component/binding/binding-manager.factory';
import { BindingQueue } from '../lib/web-component/binding/binding-queue';
import { BindingsParser } from '../lib/web-component/binding/bindings-parser';
import { TextContentExpressionParser } from '../lib/web-component/binding/text-content-expression-parser';
import { Bootstrapper } from '../lib/web-component/bootstrapper';
import { ComponentRegistry } from '../lib/web-component/component-registry';
import { InputContext } from '../lib/web-component/decorators/input/input-context';
import { OutputContext } from '../lib/web-component/decorators/output/output-context';
import { ViewChildContext } from '../lib/web-component/decorators/view-child/view-child-context';
import { RegisteredComponents } from '../lib/web-component/registered-components';
import { RepeaterDirectiveFactory } from '../lib/web-component/structural-directives/repeater/repeater-directive.factory';
import { StructuralDirectiveRegistry } from '../lib/web-component/structural-directives/structural-directive-registry';
import { WebComponentElementControllerFactory } from '../lib/web-component/web-component-element-controller.factory';
import { WebComponentThemeManager } from '../lib/web-component/web-component-theme-manager';
import { AlignToService } from '../lib/align-to/align-to.service';
import { DomService } from '../lib/dom-service/dom-service';

describe('RsXCoreUIModule tests', () => {
   beforeEach(() => {
      InjectionContainer.load(RsXCoreUIModule);
   });

   afterEach(() => {
      InjectionContainer.unload(RsXCoreUIModule);
   });

   it('can get a IHTMLParser', () => {
      const actual = InjectionContainer.get(
         RsXUIInjectionTokens.IHTMLParser
      );
      expect(actual).toBeInstanceOf(HTMLParser);
   });

   it('IHTMLParser is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXUIInjectionTokens.IHTMLParser
      );
      const a2 = InjectionContainer.get(
         RsXUIInjectionTokens.IHTMLParser
      );
      expect(a1).toBe(a2);
   });

   it('can get a IResizeObserverFactory', () => {
      const actual = InjectionContainer.get(
         RsXUIInjectionTokens.IResizeObserverFactory
      );
      expect(actual).toBeInstanceOf(ResizeObserverFactory);
   });

   it('IResizeObserverFactory is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXUIInjectionTokens.IResizeObserverFactory
      );
      const a2 = InjectionContainer.get(
         RsXUIInjectionTokens.IResizeObserverFactory
      );
      expect(a1).toBe(a2);
   });

   it('can get a IResizeObserverService', () => {
      const actual = InjectionContainer.get(
         RsXUIInjectionTokens.IResizeObserverService
      );
      expect(actual).toBeInstanceOf(ResizeObserverService);
   });

   it('IResizeObserverService is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXUIInjectionTokens.IResizeObserverService
      );
      const a2 = InjectionContainer.get(
         RsXUIInjectionTokens.IResizeObserverService
      );
      expect(a1).toBe(a2);
   });


   it('can get a IDomQuery', () => {
      const actual = InjectionContainer.get(
         RsXUIInjectionTokens.IDomQuery
      );
      expect(actual).toBeInstanceOf(DomQuery);
   });

   it('IDomQuery is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXUIInjectionTokens.IDomQuery
      );
      const a2 = InjectionContainer.get(
         RsXUIInjectionTokens.IDomQuery
      );
      expect(a1).toBe(a2);
   });


   it('can get a IInputContext', () => {
      const actual = InjectionContainer.get(
         RsXUIInjectionTokens.IInputContext
      );
      expect(actual).toBeInstanceOf(InputContext);
   });

   it('IInputContext is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXUIInjectionTokens.IInputContext
      );
      const a2 = InjectionContainer.get(
         RsXUIInjectionTokens.IInputContext
      );
      expect(a1).toBe(a2);
   });


   it('can get a IElementRemovedObserver', () => {
      const actual = InjectionContainer.get(
         RsXUIInjectionTokens.IElementRemovedObserver
      );
      expect(actual).toBeInstanceOf(ElementRemovedObserver);
   });

   it('IElementRemovedObserver is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXUIInjectionTokens.IElementRemovedObserver
      );
      const a2 = InjectionContainer.get(
         RsXUIInjectionTokens.IElementRemovedObserver
      );
      expect(a1).toBe(a2);
   });

   it('can get a IDomElementData', () => {
      const actual = InjectionContainer.get(
         RsXUIInjectionTokens.IDomElementData
      );
      expect(actual).toBeInstanceOf(DomElementData);
   });

   it('IDomElementData is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXUIInjectionTokens.IDomElementData
      );
      const a2 = InjectionContainer.get(
         RsXUIInjectionTokens.IDomElementData
      );
      expect(a1).toBe(a2);
   });


   it('Can get instance of web component theme manager service', () => {
      const actual = InjectionContainer.get(
         RsXUIInjectionTokens.IWebComponentThemeManager
      );
      expect(actual).toBeInstanceOf(WebComponentThemeManager);
   });

   it('Web component theme manager service is a singleton', () => {
      const a1 = InjectionContainer.get(
         RsXUIInjectionTokens.IWebComponentThemeManager
      );
      const a2 = InjectionContainer.get(
         RsXUIInjectionTokens.IWebComponentThemeManager
      );
      expect(a1).toBe(a2);
   });

   it('Can get instance of custom element registry', () => {
      const actual = InjectionContainer.get(
         RsXUIInjectionTokens.IComponentRegistry
      );
      expect(actual).toBeInstanceOf(ComponentRegistry);
   });

   it('Custom element registry is a singleton', () => {
      const a1 = InjectionContainer.get(
         RsXUIInjectionTokens.IComponentRegistry
      );
      const a2 = InjectionContainer.get(
         RsXUIInjectionTokens.IComponentRegistry
      );
      expect(a1).toBe(a2);
   });

   it('Can get instance of web component services factory', () => {
      const actual = InjectionContainer.get(
         RsXUIInjectionTokens.IWebComponentElementControllerFactory
      );
      expect(actual).toBeInstanceOf(WebComponentElementControllerFactory);
   });

   it('web component services factory is a singleton', () => {
      const a1 = InjectionContainer.get(
         RsXUIInjectionTokens.IWebComponentElementControllerFactory
      );
      const a2 = InjectionContainer.get(
         RsXUIInjectionTokens.IWebComponentElementControllerFactory
      );
      expect(a1).toBe(a2);
   });

   it('Can get instance of binding attribute parser', () => {
      const actual = InjectionContainer.get(
         RsXUIInjectionTokens.IBindingAttributeParser
      );
      expect(actual).toBeInstanceOf(BindingAttributeParser);
   });

   it('Binding attribute parser is a singleton', () => {
      const a1 = InjectionContainer.get(
         RsXUIInjectionTokens.IBindingAttributeParser
      );
      const a2 = InjectionContainer.get(
         RsXUIInjectionTokens.IBindingAttributeParser
      );
      expect(a1).toBe(a2);
   });

   it('Can get instance of output context', () => {
      const actual = InjectionContainer.get(
         RsXUIInjectionTokens.IOutputContext
      );
      expect(actual).toBeInstanceOf(OutputContext);
   });

   it('View child context is a singleton', () => {
      const a1 = InjectionContainer.get(
         RsXUIInjectionTokens.IViewChildContext
      );
      const a2 = InjectionContainer.get(
         RsXUIInjectionTokens.IViewChildContext
      );
      expect(a1).toBe(a2);
   });

   it('Can get instance of view child context', () => {
      const actual = InjectionContainer.get(
         RsXUIInjectionTokens.IViewChildContext
      );
      expect(actual).toBeInstanceOf(ViewChildContext);
   });

   it('can get a bootstrapper instance', () => {
      const actual = InjectionContainer.get(
         RsXUIInjectionTokens.IBootstrapper
      );
      expect(actual).toBeInstanceOf(Bootstrapper);
   });

   it('bootstrapper is a singleton', () => {
      const a1 = InjectionContainer.get(RsXUIInjectionTokens.IBootstrapper);
      const a2 = InjectionContainer.get(RsXUIInjectionTokens.IBootstrapper);
      expect(a1).toBe(a2);
   });

   it('Can get a registered components instance', () => {
      const actual = InjectionContainer.get(
         RsXUIInjectionTokens.IRegisteredComponents
      );
      expect(actual).toBeInstanceOf(RegisteredComponents);
   });

   it('registered components is a singleton', () => {
      const a1 = InjectionContainer.get(
         RsXUIInjectionTokens.IRegisteredComponents
      );
      const a2 = InjectionContainer.get(
         RsXUIInjectionTokens.IRegisteredComponents
      );
      expect(a1).toBe(a2);
   });
   it('can get a binding queue instance', () => {
      const actual = InjectionContainer.get(
         RsXUIInjectionTokens.IBindingQueue
      );
      expect(actual).toBeInstanceOf(BindingQueue);
   });

   it('Binding Queue is a singelton', () => {
      const a1 = InjectionContainer.get(RsXUIInjectionTokens.IBindingQueue);
      const a2 = InjectionContainer.get(RsXUIInjectionTokens.IBindingQueue);
      expect(a1).toBe(a2);
   });

   it('can get a text content expression parser instance', () => {
      const actual = InjectionContainer.get(
         RsXUIInjectionTokens.ITextContentExpressionParser
      );
      expect(actual).toBeInstanceOf(TextContentExpressionParser);
   });

   it('text content expression parser  is a singleton', () => {
      const a1 = InjectionContainer.get(
         RsXUIInjectionTokens.ITextContentExpressionParser
      );
      const a2 = InjectionContainer.get(
         RsXUIInjectionTokens.ITextContentExpressionParser
      );
      expect(a1).toBe(a2);
   });

   it('can get a binding parser instance', () => {
      const actual = InjectionContainer.get(
         RsXUIInjectionTokens.IBindingsParser
      );
      expect(actual).toBeInstanceOf(BindingsParser);
   });

   it('binding parser is a singleton', () => {
      const a1 = InjectionContainer.get(
         RsXUIInjectionTokens.IBindingsParser
      );
      const a2 = InjectionContainer.get(
         RsXUIInjectionTokens.IBindingsParser
      );
      expect(a1).toBe(a2);
   });

   it('can get a binding manager factory instance', () => {
      const actual = InjectionContainer.get(
         RsXUIInjectionTokens.IBindingManagerFactory
      );
      expect(actual).toBeInstanceOf(BindingManagerFactory);
   });

   it(' binding manager factory iis a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXUIInjectionTokens.IBindingManagerFactory
      );
      const a2 = InjectionContainer.get(
         RsXUIInjectionTokens.IBindingManagerFactory
      );
      expect(a1).toBe(a2);
   });

   it('can get a structural directive registry', () => {
      const actual = InjectionContainer.get(
         RsXUIInjectionTokens.IStructuralDirectiveRegistry
      );
      expect(actual).toBeInstanceOf(StructuralDirectiveRegistry);
   });

   it('structural directive registry is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXUIInjectionTokens.IStructuralDirectiveRegistry
      );
      const a2 = InjectionContainer.get(
         RsXUIInjectionTokens.IStructuralDirectiveRegistry
      );
      expect(a1).toBe(a2);
   });

   it('can get the templated element factories service', () => {
      const actual = InjectionContainer.get(
         RsXUIInjectionTokens.ITemplatedElementFactories
      );
      expect(actual).toBeInstanceOf(TemplatedElementFactories);
   });

   it('templated element factories service is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXUIInjectionTokens.ITemplatedElementFactories
      );
      const a2 = InjectionContainer.get(
         RsXUIInjectionTokens.ITemplatedElementFactories
      );
      expect(a1).toBe(a2);
   });

   it('can get a repeater directive factory', () => {
      const actual = InjectionContainer.get(
         RsXUIInjectionTokens.RepeaterDirectiveFactory
      );
      expect(actual).toBeInstanceOf(RepeaterDirectiveFactory);
   });

   it('repeater directive fctory is a singelton', () => {
      const a1 = InjectionContainer.get(
         RsXUIInjectionTokens.RepeaterDirectiveFactory
      );
      const a2 = InjectionContainer.get(
         RsXUIInjectionTokens.RepeaterDirectiveFactory
      );
      expect(a1).toBe(a2);
   });


   it('can get instance of IDomWindow', () => {
      const actual = InjectionContainer.get(RsXUIInjectionTokens.IDomWindow);
      expect(actual).toBe(window);
   });

   it('IDomWindow instance is a singleton', () => {
      const a1 = InjectionContainer.get(RsXUIInjectionTokens.IDomWindow);
      const a2 = InjectionContainer.get(RsXUIInjectionTokens.IDomWindow);
      expect(a1).toBe(a2);
   });

   it('can get instance of IDomService', () => {
      const actual = InjectionContainer.get(RsXUIInjectionTokens.IDomService);
      expect(actual).toBeInstanceOf(DomService);
   });

   it('IDomService instance is a singleton', () => {
      const a1 = InjectionContainer.get(RsXUIInjectionTokens.IDomService);
      const a2 = InjectionContainer.get(RsXUIInjectionTokens.IDomService);
      expect(a1).toBe(a2);
   });

   it('can get instance of IAlignToService', () => {
      const actual = InjectionContainer.get(RsXUIInjectionTokens.IAlignToService);
      expect(actual).toBeInstanceOf(AlignToService);
   });

   it('IAlignToService is transient', () => {
      const a1 = InjectionContainer.get(RsXUIInjectionTokens.IAlignToService);
      const a2 = InjectionContainer.get(RsXUIInjectionTokens.IAlignToService);
      expect(a1).not.toBe(a2);
   });

   it('can get instance of IDomElementFactory', () => {
      const actual = InjectionContainer.get(RsXUIInjectionTokens.IDomElementFactory);
      expect(actual).toBe(document);
   });

   it('IDomElementFactory returns the same document reference', () => {
      const a1 = InjectionContainer.get(RsXUIInjectionTokens.IDomElementFactory);
      const a2 = InjectionContainer.get(RsXUIInjectionTokens.IDomElementFactory);
      expect(a1).toBe(a2);
   });

});
