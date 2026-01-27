import {
    ChangeDetectorRef,
    inject,
    Pipe,
    type OnDestroy,
    type PipeTransform
} from '@angular/core';
import {
    type IExpression
} from '@rs-x/expression-parser';
import { Subscription } from 'rxjs';
import { IExpressionFactoryToken } from './rsx.module';

@Pipe({
    name: 'rsx',
    pure: false,
})
export class RsxPipe implements PipeTransform, OnDestroy {
    private readonly _changeDetectorRef = inject(ChangeDetectorRef);
    private readonly _expressionFactory = inject(IExpressionFactoryToken);
    private _expression?: IExpression<unknown>;
    private _changedSubscription?: Subscription;
    private _lastExpressionString?: string;
    private _lastContext?: object;
    private _value: unknown;
   
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
        this._expression = this._expressionFactory.create(context, expressionString)
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