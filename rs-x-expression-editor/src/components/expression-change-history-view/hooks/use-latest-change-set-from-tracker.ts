import { useEffect, useRef, useState } from 'react';
import type { Subscription } from 'rxjs';
import type { IExpression, IExpressionChangeHistory, IExpressionChangeTracker } from '@rs-x/expression-parser';

function expressionItemKey(item: IExpressionChangeHistory): string {
    const e = item.expression;
    return `${e.expressionString}::${String(e.type)}::${String(item.oldValue)}=>${String(item.value)}`;
}

function stackKey(stack: readonly IExpressionChangeHistory[]): string {
    return stack.map(expressionItemKey).join('|');
}

export function useLatestChangeSetFromTracker(args: {
    expression: IExpression | null | undefined;
    useTracker: (expr: IExpression) => IExpressionChangeTracker | null;
}): IExpressionChangeHistory[] {
    const { expression, useTracker } = args;

    const tracker = expression ? useTracker(expression) : null;

    const [latest, setLatest] = useState<IExpressionChangeHistory[]>([]);
    const lastKeyRef = useRef<string | null>(null);
    const subRef = useRef<Subscription | null>(null);

    useEffect(() => {
        subRef.current?.unsubscribe();
        subRef.current = null;
        lastKeyRef.current = null;

        if (!tracker) {
            setLatest([]);
            return;
        }

        subRef.current = tracker.changed.subscribe((stack) => {
            const key = stackKey(stack);
            if (lastKeyRef.current === key) {
                return;
            }
            lastKeyRef.current = key;
            setLatest(stack);
        });

        return () => {
            subRef.current?.unsubscribe();
            subRef.current = null;
        };
    }, [tracker]);

    return latest;
}