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

export function registerMultiInjectServices(
   options: ContainerModuleLoadOptions,
   multiInjectToken: symbol,
   services: ({target:  Newable<unknown>, token: symbol})[]
) {
   
   services.forEach(service => 
      registerMultiInjectService(
         options,
         service.target,
         {multiInjectToken, serviceToken: service.token }, 
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