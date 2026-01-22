import {
    ChangeDetectorRef,
    OnDestroy,
    Pipe,
    PipeTransform
} from '@angular/core';
import { InjectionContainer } from '@rs-x/core';
import {
    IExpression,
    IExpressionFactory,
    RsXExpressionParserInjectionTokens
} from '@rs-x/expression-parser';
import { Subscription } from 'rxjs';

@Pipe({
    name: 'rsx',
    pure: false
})
export class RsxPipe implements PipeTransform, OnDestroy {
    private readonly _expressionFactory: IExpressionFactory;
    private _expression?: IExpression<unknown>;
    private _changedSubscription?: Subscription;
    private _lastExpressionString?: string;
    private _lastContext?: object;
    private _value: unknown;
    
    constructor(private readonly _changeDetectorRef: ChangeDetectorRef) {
        this._expressionFactory =
            InjectionContainer.get(
                RsXExpressionParserInjectionTokens.IExpressionFactory
            );
    }

    public transform(expressionString: string, context: object): unknown {
        if (!expressionString || !context) {
            return null;
        }
    
        if (
            expressionString !== this._lastExpressionString ||
            context !== this._lastContext
        ) {
            this.disposeExpression();
            this.createExpression(expressionString, context);
        }

        return this._value;
    }

    public ngOnDestroy(): void {
        this.disposeExpression();
    }

    private createExpression(expressionString: string, context: object): void {
        this._lastExpressionString = expressionString;
        this._lastContext = context;

        this._expression = this._expressionFactory.create(context, expressionString);
        this._changedSubscription = this._expression.changed.subscribe(() => {
            this._value = this._expression!.value;
            this._changeDetectorRef.markForCheck();
        });
    }

    private disposeExpression(): void {
        this._changedSubscription?.unsubscribe();
        this._changedSubscription = undefined;

        this._expression?.dispose();
        this._expression = undefined;
    }
}