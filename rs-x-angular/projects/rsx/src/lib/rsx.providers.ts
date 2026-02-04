import { APP_INITIALIZER, InjectionToken, type Provider } from '@angular/core';

import { InjectionContainer } from '@rs-x/core';
import {
  type IExpressionChangeTransactionManager,
  type IExpressionFactory,
  RsXExpressionParserInjectionTokens,
  RsXExpressionParserModule,
} from '@rs-x/expression-parser';

export const IExpressionFactoryToken = new InjectionToken<IExpressionFactory>(
  'IExpressionFactoryProvider',
);

export const IExpressionChangeTransactionManagerToken =
  new InjectionToken<IExpressionChangeTransactionManager>(
    'IExpressionChangeTransactionManager',
  );

function initializeRsx(): () => Promise<void> {
  return () => {
    if (
      InjectionContainer.isBound(
        RsXExpressionParserInjectionTokens.IExpressionFactory,
      )
    ) {
      return Promise.resolve();
    }
    return InjectionContainer.load(RsXExpressionParserModule);
  };
}

export function providexRsx(): Provider[] {
  return [
    {
      provide: APP_INITIALIZER,
      useFactory: initializeRsx,
      multi: true,
    },
    {
      provide: IExpressionFactoryToken,
      useFactory: () =>
        InjectionContainer.get(
          RsXExpressionParserInjectionTokens.IExpressionFactory,
        ),
    },
    {
      provide: IExpressionChangeTransactionManagerToken,
      useFactory: () =>
        InjectionContainer.get(
          RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager,
        ),
    },
  ];
}
