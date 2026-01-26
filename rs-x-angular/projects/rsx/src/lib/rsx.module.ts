import { APP_INITIALIZER, InjectionToken, NgModule } from '@angular/core';
import { InjectionContainer } from '@rs-x/core';
import { IExpressionFactory, RsXExpressionParserInjectionTokens, RsXExpressionParserModule } from '@rs-x/expression-parser';

export const IExpressionFactoryToken = new InjectionToken<IExpressionFactory>('IExpressionFactoryProvider');

function initializeRsx(): () => Promise<void> {
    return () => {
        if(InjectionContainer.isBound(RsXExpressionParserInjectionTokens.IExpressionFactory)) {
            return Promise.resolve();
        }
        return InjectionContainer.load(RsXExpressionParserModule);
    }
}

@NgModule({
    providers: [
        {
            provide: APP_INITIALIZER,
            useFactory: initializeRsx,
            multi: true
        },
        {
            provide: IExpressionFactoryToken,
            useFactory: () => InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionFactory)
        }
    ],
})
export class RsxModule { }