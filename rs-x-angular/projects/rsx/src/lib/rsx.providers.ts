import { APP_INITIALIZER, InjectionToken, type Provider } from '@angular/core';

import { InjectionContainer } from '@rs-x/core';
import { type IExpressionFactory, RsXExpressionParserInjectionTokens, RsXExpressionParserModule } from '@rs-x/expression-parser';

export const IExpressionFactoryToken = new InjectionToken<IExpressionFactory>('IExpressionFactoryProvider');

function initializeRsx(): () => Promise<void> {
  return () => {
    if (InjectionContainer.isBound(RsXExpressionParserInjectionTokens.IExpressionFactory)) {
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
      multi: true
    },
    {
      provide: IExpressionFactoryToken,
      useFactory: () => InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionFactory)
    }
  ];
}