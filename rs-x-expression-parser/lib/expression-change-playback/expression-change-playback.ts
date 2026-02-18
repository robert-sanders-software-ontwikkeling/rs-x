import { Inject, Injectable } from '@rs-x/core';
import { IExpressionChangeTransactionManager } from '../expresion-change-transaction-manager.interface';
import { IdentifierExpression } from '../expressions/identifier-expression';
import { RsXExpressionParserInjectionTokens } from '../rs-x-expression-parser-injection-tokes';
import { IExpressionChangePlayback } from './expression-change-playback.interface';
import { IExpressionChangeHistory } from '../expression-change-tracker';

@Injectable()
export class ExpressionChangePlayback implements IExpressionChangePlayback {

    constructor(
        @Inject(RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager)
        private readonly _expressionChangeTransactionManager: IExpressionChangeTransactionManager

    ) {
    }

    public playForward(t: number, history: IExpressionChangeHistory[][]): void {
        if (!history || history.length === 0) {
            return;
        }

        this._expressionChangeTransactionManager.suspend();

        try {
            const cursorIndex = this.clampT(t, history.length);

            // We want the LAST change at-or-before `cursorIndex` for each identifier.
            // That last change's new value is the value at the cursor position.
            const lastChangeAtOrBeforeByIdentifier = new Map<IdentifierExpression, IExpressionChangeHistory>();

            for (let batchIndex = 0; batchIndex <= cursorIndex; batchIndex++) {
                const batch = history[batchIndex];
                if (!batch || batch.length === 0) {
                    continue;
                }

                for (let changeIndex = 0; changeIndex < batch.length; changeIndex++) {
                    const change = batch[changeIndex];
                    if (!change) {
                        continue;
                    }

                    const expression = change.expression;
                    if (!(expression instanceof IdentifierExpression)) {
                        continue;
                    }

                    // Last occurrence wins; keep insertion order matching the last time it occurred
                    if (lastChangeAtOrBeforeByIdentifier.has(expression)) {
                        lastChangeAtOrBeforeByIdentifier.delete(expression);
                    }
                    lastChangeAtOrBeforeByIdentifier.set(expression, change);
                }
            }

            // Apply in chronological "last occurrence" order (Map insertion order).
            for (const change of lastChangeAtOrBeforeByIdentifier.values()) {
                (change.expression as IdentifierExpression).setValue(change.value);
            }
        } finally {
            this._expressionChangeTransactionManager.continue();
        }
    }

    public playBackward(t: number, history: IExpressionChangeHistory[][]): void {
        if (!history || history.length === 0) {
            return;
        }

        this._expressionChangeTransactionManager.suspend();

        try {
            const cursorIndex = this.clampT(t, history.length);

            // We want the FIRST change at-or-after `cursorIndex` for each identifier.
            // That first change's oldValue is the value at the cursor position.
            const firstChangeAtOrAfterByIdentifier = new Map<IdentifierExpression, IExpressionChangeHistory>();

            for (let batchIndex = cursorIndex; batchIndex < history.length; batchIndex++) {
                const batch = history[batchIndex];
                if (!batch || batch.length === 0) {
                    continue;
                }

                for (let changeIndex = 0; changeIndex < batch.length; changeIndex++) {
                    const change = batch[changeIndex];
                    if (!change) {
                        continue;
                    }

                    const expression = change.expression;
                    if (!(expression instanceof IdentifierExpression)) {
                        continue;
                    }

                    // First occurrence wins (earliest in time range)
                    if (!firstChangeAtOrAfterByIdentifier.has(expression)) {
                        firstChangeAtOrAfterByIdentifier.set(expression, change);
                    }
                }
            }

            // Apply in time order (Map insertion order = increasing batchIndex, then increasing changeIndex)
            for (const change of firstChangeAtOrAfterByIdentifier.values()) {
                (change.expression as IdentifierExpression).setValue(change.oldValue);
            }
        } finally {
            this._expressionChangeTransactionManager.continue();
        }
    }

    private clampT(t: number, length: number): number {
        if (!Number.isFinite(t)) {
            return length - 1;
        }
        if (t < 0) {
            return 0;
        }
        if (t >= length) {
            return length - 1;
        }
        return t;
    }
}