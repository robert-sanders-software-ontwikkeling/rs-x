import { APP_INITIALIZER } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';

import { InjectionContainer } from '@rs-x/core';
import {
  RsXExpressionParserInjectionTokens,
  RsXExpressionParserModule,
} from '@rs-x/expression-parser';

import {
  IExpressionChangeTransactionManagerToken,
  IExpressionFactoryToken,
  providexRsx,
} from './rsx.providers';

describe('providexRsx', () => {
  it('loads the RS-X module when the container is not bound', async () => {
    const isBoundSpy = vi
      .spyOn(InjectionContainer, 'isBound')
      .mockReturnValue(false);
    const loadSpy = vi
      .spyOn(InjectionContainer, 'load')
      .mockResolvedValue(undefined);

    const providers = providexRsx();
    const initializer = providers.find(
      (provider) => provider.provide === APP_INITIALIZER,
    );

    const initFactory = initializer?.useFactory as
      | (() => () => Promise<void>)
      | undefined;
    expect(initFactory).toBeDefined();

    await initFactory!()();

    expect(isBoundSpy).toHaveBeenCalledWith(
      RsXExpressionParserInjectionTokens.IExpressionFactory,
    );
    expect(loadSpy).toHaveBeenCalledWith(RsXExpressionParserModule);

    isBoundSpy.mockRestore();
    loadSpy.mockRestore();
  });

  it('skips loading when the container is already bound', async () => {
    const isBoundSpy = vi
      .spyOn(InjectionContainer, 'isBound')
      .mockReturnValue(true);
    const loadSpy = vi
      .spyOn(InjectionContainer, 'load')
      .mockResolvedValue(undefined);

    const providers = providexRsx();
    const initializer = providers.find(
      (provider) => provider.provide === APP_INITIALIZER,
    );
    const initFactory = initializer?.useFactory as
      | (() => () => Promise<void>)
      | undefined;

    await initFactory!()();

    expect(loadSpy).not.toHaveBeenCalled();

    isBoundSpy.mockRestore();
    loadSpy.mockRestore();
  });

  it('resolves expression services from the InjectionContainer', () => {
    const factoryMock = { create: vi.fn() };
    const transactionManagerMock = { begin: vi.fn() };

    const getSpy = vi
      .spyOn(InjectionContainer, 'get')
      .mockImplementation((token) => {
        if (token === RsXExpressionParserInjectionTokens.IExpressionFactory) {
          return factoryMock;
        }
        if (
          token ===
          RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager
        ) {
          return transactionManagerMock;
        }
        throw new Error(`Unexpected token: ${String(token)}`);
      });

    const providers = providexRsx();
    const factoryProvider = providers.find(
      (provider) => provider.provide === IExpressionFactoryToken,
    );
    const transactionProvider = providers.find(
      (provider) =>
        provider.provide === IExpressionChangeTransactionManagerToken,
    );

    const factory = factoryProvider?.useFactory as (() => unknown) | undefined;
    const transactionManager = transactionProvider?.useFactory as
      | (() => unknown)
      | undefined;

    expect(factory?.()).toBe(factoryMock);
    expect(transactionManager?.()).toBe(transactionManagerMock);

    getSpy.mockRestore();
  });
});
