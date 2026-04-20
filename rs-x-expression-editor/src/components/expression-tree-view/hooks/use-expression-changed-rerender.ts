import { useEffect, useState } from 'react';

import type { IExpressionTree } from '@rs-x/expression-parser';

export function useExpressionChangedRerender(
  expression: IExpressionTree | null | undefined,
): number {
  const [tick, setTick] = useState<number>(0);

  useEffect(() => {
    if (!expression) {
      return;
    }

    const subsription = expression.changed.subscribe(() => {
      setTick((v) => v + 1);
    });

    return () => {
      subsription.unsubscribe();
    };
  }, [expression]);

  return tick;
}
