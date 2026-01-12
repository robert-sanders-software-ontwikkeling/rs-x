import {
   Container,
   ContainerModule,
   inject,
   injectable,
   multiInject,
   unmanaged,
   preDestroy,
   ServiceIdentifier,
   BindToFluentSyntax,
   Newable,
   ContainerModuleLoadOptions,
} from 'inversify';
import 'reflect-metadata';
import { ConstructorType } from './types';
export {
   inject as Inject,
   multiInject as MultiInject,
   injectable as Injectable,
   unmanaged as Unmanaged,
   ContainerModule,
   Container,
   preDestroy as PreDestroy,
   Newable
};

export const InjectionContainer = new Container();

export async function replaceBinding(
   injectionToken: ServiceIdentifier,
   type: ConstructorType
): Promise<void> {
   await InjectionContainer.unbind(injectionToken);
   InjectionContainer.bind(injectionToken).to(type).inSingletonScope();
}

export type BindMethod = <T>(
   serviceIdentifier: ServiceIdentifier<T>
) => BindToFluentSyntax<T>;

export interface IMultiInjectTokens {
   serviceToken?: symbol;
   multiInjectToken: symbol;
}


export interface MultiInjectService {
   target: Newable<unknown>;
   token: symbol;
}

export function registerMultiInjectServices(
   options: ContainerModuleLoadOptions,
   multiInjectToken: symbol,
   services: MultiInjectService[]
) {

   services.forEach(service =>
      registerMultiInjectService(
         options,
         service.target,
         { multiInjectToken, serviceToken: service.token },
      )
   );
}

export function registerMultiInjectService(
   injectionContainer: ContainerModuleLoadOptions | Container,
   target: Newable<unknown>,
   options: IMultiInjectTokens) {
   injectionContainer.bind(target).to(target).inSingletonScope();

   if (options.serviceToken) {
      injectionContainer.bind(options.serviceToken).toService(target);
   }


   injectionContainer
      .bind(options.multiInjectToken)
      .toService(target);
}

export function overrideMultiInjectServices(
    container: Container | ContainerModuleLoadOptions,
    multiInjectToken: symbol,
    services: MultiInjectService[]
) {
    // Remove previous multiInject token bindings
    if (container.isBound(multiInjectToken)) {
        container.unbind(multiInjectToken);
    }

    const seen = new Set<Newable<unknown>>();

    services.forEach(service => {
        if (seen.has(service.target)) return;
        seen.add(service.target);

        // Bind the class itself if not already bound
        if (!container.isBound(service.target)) {
            container.bind(service.target).to(service.target).inSingletonScope();
        }

        // Bind the service token if provided
        if (service.token && !container.isBound(service.token)) {
            container.bind(service.token).toService(service.target);
        }

        // Bind to the multi-inject token
        container.bind(multiInjectToken).toService(service.target);
    });
}