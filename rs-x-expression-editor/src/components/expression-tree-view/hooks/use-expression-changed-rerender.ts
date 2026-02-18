import { useEffect, useState } from 'react';
import type { IExpression } from '@rs-x/expression-parser';

export function useExpressionChangedRerender(expr: IExpression | null | undefined): number {
  const [tick, setTick] = useState<number>(0);

  useEffect(() => {
    if (!expr) {
      return;
    }

    const sub = expr.changed.subscribe(() => {
      setTick((v) => v + 1);
    });

    return () => {
      sub.unsubscribe();
    };
  }, [expr]);

  return tick;
}