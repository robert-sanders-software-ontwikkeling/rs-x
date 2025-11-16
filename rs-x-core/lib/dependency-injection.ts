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
