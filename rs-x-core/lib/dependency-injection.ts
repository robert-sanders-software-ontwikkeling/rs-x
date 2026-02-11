import {
  type BindToFluentSyntax,
  Container,
  ContainerModule,
  type ContainerModuleLoadOptions,
  inject,
  injectable,
  multiInject,
  type Newable,
  preDestroy,
  type ServiceIdentifier,
  unmanaged,
} from 'inversify';

import 'reflect-metadata';
import { Type } from './types/type';

/* ---------------------------------------------------------
 * Runtime values
 * --------------------------------------------------------- */

export const InjectionContainer = new Container();


window.RSX_INJECTION_CONTAINER = InjectionContainer


/* ---------------------------------------------------------
 * Runtime re-exports (decorators & classes)
 * --------------------------------------------------------- */

export {
  Container,
  ContainerModule,
  inject as Inject,
  injectable as Injectable,
  multiInject as MultiInject,
  preDestroy as PreDestroy,
  unmanaged as Unmanaged,
};

/* ---------------------------------------------------------
 * Type-only exports
 * --------------------------------------------------------- */

export type {
  BindToFluentSyntax,
  ContainerModuleLoadOptions,
  Newable,
  ServiceIdentifier,
};

/* ---------------------------------------------------------
 * Helper types
 * --------------------------------------------------------- */

export interface IMultiInjectTokens {
  serviceToken?: symbol;
  multiInjectToken: symbol;
}

export interface IMultiInjectService {
  target: Newable<unknown>;
  token: symbol;
}

export type BindMethod = <T>(
  serviceIdentifier: ServiceIdentifier<T>,
) => BindToFluentSyntax<T>;

/* ---------------------------------------------------------
 * Multi-inject helpers
 * --------------------------------------------------------- */

export function registerMultiInjectService(
  container: Container | ContainerModuleLoadOptions,
  target: Newable<unknown>,
  options: IMultiInjectTokens,
): void {
  container.bind(target).to(target).inSingletonScope();

  if (options.serviceToken) {
    container.bind(options.serviceToken).toService(target);
  }

  container.bind(options.multiInjectToken).toService(target);
}

export function registerMultiInjectServices(
  container: Container | ContainerModuleLoadOptions,
  multiInjectToken: symbol,
  services: readonly IMultiInjectService[],
): void {
  services.forEach((service) =>
    registerMultiInjectService(container, service.target, {
      multiInjectToken,
      serviceToken: service.token,
    }),
  );
}

export function overrideMultiInjectServices(
  container: Container | ContainerModuleLoadOptions,
  multiInjectToken: symbol,
  services: readonly IMultiInjectService[],
): void {
  if (container.isBound(multiInjectToken)) {
    container.unbind(multiInjectToken);
  }

  const seen = new Set<Newable<unknown>>();

  services.forEach((service) => {
    if (seen.has(service.target)) {
      return;
    }
    seen.add(service.target);

    if (!container.isBound(service.target)) {
      container.bind(service.target).to(service.target).inSingletonScope();
    }

    if (service.token && !container.isBound(service.token)) {
      container.bind(service.token).toService(service.target);
    }

    container.bind(multiInjectToken).toService(service.target);
  });
}
