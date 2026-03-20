/* eslint-disable @typescript-eslint/no-explicit-any */
import {
   Assertion,
   ConstructorType,
   ContainerModule,
   InjectionContainer,
   WaitForEvent,
} from '@rs-x/core';
import { Observable } from 'rxjs';
import { HTMLParser } from '../html-parser/html-parser';
import { HtmlTagName } from '../html-elements/html-tag-name';
import { RsXCoreUIModule } from '../rs-x-ui.module';
import { RsXUIInjectionTokens } from '../rx-x-ui.injection-tokens';
import { Bootstrapper } from '../web-component/bootstrapper';
import { Component } from '../web-component/decorators';
import {
   IComponentRegistry,
   ICustomElement,
   ICustomElementController,
   ICustomElementConnector,
   IWebComponentController,
   IWebComponentElement,
} from '../web-component/interfaces';
import { WebComponentController } from '../web-component/web-component-controller';
import { WebComponentElement } from '../web-component/web-component-element';

export function triggerEvent<T, E extends keyof T>(
   target: any,
   eventName: E,
   trigger: () => void
): Promise<T> {
   Assertion.assertNotNullOrUndefined(target[eventName], String(eventName));
   return new Promise((resolve) => {
      const subscription = (target[eventName] as Observable<T>).subscribe(
         (result) => {
            subscription.unsubscribe();
            resolve(result);
         }
      );
      trigger();
   });
}

export function createTemplate(html: string): HTMLTemplateElement {
   const htmlParser = new HTMLParser();
   const nodes = htmlParser.parse(html);
   const htmlTemplateElement: HTMLTemplateElement = document.createElement(
      HtmlTagName.Template
   );
   nodes.forEach((node) => htmlTemplateElement.content.appendChild(node));
   return htmlTemplateElement;
}

export interface IOnCustomElementEventAction {
   name: string;
   forType: any;
   eventName: string;
   execute?: (component?: any) => any;
}

export function waitForCustomElementEvent(
   actions: IOnCustomElementEventAction[],
   html: string
): Promise<{ [name: string]: unknown }> {
   const result = {};
   let count = 0;
   return new Promise((resolve) => {
      const registry: IComponentRegistry = InjectionContainer.get(
         RsXUIInjectionTokens.IComponentRegistry
      );

      const onAttaching = (
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         component: any
      ) => {
         const action = actions.find((a) => component instanceof a.forType);
         if (!action) {
            return;
         }
         component[action.eventName].subscribe(() => {
            const execute = action.execute ?? ((component) => component);

            result[action.name] = execute(component);
            count++;
            if (count === actions.length) {
               subscription.unsubscribe();
               resolve(result);
            }
         });
      };
      const subscription = registry.attaching.subscribe(onAttaching);

      document.body.innerHTML = html;
   });
}

export function getElement<
   T extends IWebComponentElement<IWebComponentController>,
>(
   tagName: string,
   givenParent?: Element
): ICustomElementConnector<IWebComponentController, T> | undefined {
   const parent = givenParent ?? document.querySelector('my-app');

   if (!parent) {
      return undefined;
   }

   if (parent.tagName.toLowerCase() === tagName) {
      return parent as any;
   }
   const container = parent.shadowRoot ? parent.shadowRoot : parent;

   const children =
      container instanceof HTMLSlotElement
         ? container.assignedNodes()
         : container.children;

   for (const child of Array.from(children).filter(
      (node) => node.nodeType === Node.ELEMENT_NODE
   )) {
      const component = getElement<T>(tagName, child as any);
      if (component) {
         return component;
      }
   }
   return undefined;
}

export const componentTestContextSelector = 'component-test-context';

export function setupWebComponentTests(
   modules?: ContainerModule[]
): Promise<void> {
   return Bootstrapper.bootstrap({ modules });
}

export function teardownWebComponentTests(): Promise<void> {
   return InjectionContainer.unload(RsXCoreUIModule);
}

export function registerComponentTestContext(
   template: string,
   setup: (component: any) => void,
   dependencies: ConstructorType<any>[],
   modules: ContainerModule[],
   selector?: string
): void {
   setupWebComponentTests(modules);
   @Component({
      selector: selector ?? componentTestContextSelector,
      template,
      dependencies,
      controllerFactoryToken: WebComponentController,
   })
   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   class TestContextComponent extends WebComponentElement {
      constructor() {
         super();
         setup(this);
      }
   }

   Bootstrapper.registerWebComponents();
}

export async function boostrapComponent<
   CT extends ICustomElementController = ICustomElementController,
   ET extends ICustomElement<CT> = ICustomElement<CT>,
>(selector?: string): Promise<ICustomElementConnector<CT, ET>> {
   const registry: IComponentRegistry = InjectionContainer.get(
      RsXUIInjectionTokens.IComponentRegistry
   );

   const tag = selector ?? componentTestContextSelector;
   await new WaitForEvent(registry, 'ready').wait(() => {
      document.body.innerHTML = `<${tag}></${tag}>`;
   });
   return document.querySelector(componentTestContextSelector) as any;
}
