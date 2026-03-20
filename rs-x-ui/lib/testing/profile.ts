import { InjectionContainer } from '@rs-x/core';
import { map } from 'rxjs';
import { RsXUIInjectionTokens } from '../rx-x-ui.injection-tokens';
import {
   IComponentRegistry,
   ICustomElement,
   ICustomElementController,
} from '../web-component/interfaces';

export interface IWebComponentProfile {
   attachTime: number;
   attachBindingsTime: number;
   buildContentTime: number;
   bindEventsTime: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function profile(action: () => Promise<any>): Promise<number> {
   const start = performance.now();
   await action();
   return performance.now() - start;
}

export function profileLoadTimeCustomElement(
   html: string,
   predicate: (
      customElement: ICustomElement<ICustomElementController>
   ) => boolean,
   timeout = 1000
): Promise<number> {
   return new Promise((resolve) => {
      const timerId = window.setTimeout(() => {
         subscription.unsubscribe();
         resolve(-1);
      }, timeout);

      const registry: IComponentRegistry = InjectionContainer.get(
         RsXUIInjectionTokens.IComponentRegistry
      );
      const subscription = registry.ready.subscribe((customElement) => {
         if (predicate(customElement)) {
            const end = performance.now() - start;
            window.clearTimeout(timerId);
            subscription.unsubscribe();
            resolve(end);
         }
      });
      const start = performance.now();
      document.body.innerHTML = html;
   });
}

export function profileWebComponent(
   action: VoidFunction,
   predicate: (
      customElement: ICustomElement<ICustomElementController>
   ) => boolean,
   timeout = 1000
): Promise<IWebComponentProfile | null> {
   return new Promise((resolve) => {
      const profileInfo: IWebComponentProfile = {
         attachTime: -1,
         attachBindingsTime: -1,
         buildContentTime: -1,
         bindEventsTime: -1,
      };
      const timerId = window.setTimeout(() => {
         teardown();
         resolve(null);
      }, timeout);

      let target: ICustomElement<ICustomElementController>;
      let oldBuildContent;
      let oldAttachBindings;
      let oldbindEvents;
      let oldAttach;
      const teardown = () => {
         window.clearTimeout(timerId);
         subscription.unsubscribe();
         if (target) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (target.controller as any).buildContent = oldBuildContent;
            target.controller.bindingManager!.attachBindings = oldAttachBindings;
            target.controller.eventManager!.bindEvents = oldbindEvents;
            target.attach = oldAttach;
         }
      };

      const registry: IComponentRegistry = InjectionContainer.get(
         RsXUIInjectionTokens.IComponentRegistry
      );

      const subscription = registry.attaching.subscribe((customElement) => {
         if (predicate(customElement)) {
            target = customElement;

            customElement.controller.buildContent = () => {
               const start = performance.now();
               oldBuildContent.call(customElement.controller);
               profileInfo.buildContentTime = performance.now() - start;
            };
            oldAttachBindings = oldAttachBindings =
               customElement.controller.bindingManager!.attachBindings;
            customElement.controller.bindingManager!.attachBindings = (
               content
            ) => {
               const start = performance.now();
               return oldAttachBindings
                  .call(customElement.controller.bindingManager, content)
                  .pipe(
                     map((result) => {
                        profileInfo.attachBindingsTime =
                           performance.now() - start;
                        return result;
                     })
                  );
            };
            oldbindEvents = customElement.controller.eventManager!.bindEvents;
            customElement.controller.eventManager!.bindEvents = (elements) => {
               const start = performance.now();
               oldbindEvents.call(
                  customElement.controller.eventManager,
                  elements
               );
               profileInfo.bindEventsTime = performance.now() - start;
            };

            oldAttach = customElement.attach;
            customElement.attach = (element) => {
               const start = performance.now();
               return oldAttach.call(customElement, element).pipe(
                  map((result) => {
                     profileInfo.attachTime = performance.now() - start;
                     teardown();
                     resolve(profileInfo);
                     return result;
                  })
               );
            };
         }
      });
      action();
   });
}
