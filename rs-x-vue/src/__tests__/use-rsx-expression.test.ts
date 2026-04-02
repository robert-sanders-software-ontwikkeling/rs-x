import { describe, expect, it } from 'vitest';
import { effectScope, nextTick, reactive } from 'vue';

import type { IExpression } from '@rs-x/expression-parser';

import { getExpressionFactory } from '../expression.factory';
import { useRsxExpression } from '../hooks/use-rsx-expression';

describe('useRsxExpression (Vue)', () => {
  it('binds a string expression and updates when the model changes', async () => {
    const model = reactive({ x: 2, y: 3 });
    const scope = effectScope();
    let valueRef: ReturnType<typeof useRsxExpression<number>> | undefined;

    scope.run(() => {
      valueRef = useRsxExpression<number>('x + y', { model });
    });

    await nextTick();
    expect(valueRef?.value).toBe(5);

    model.x = 10;
    await nextTick();

    expect(valueRef?.value).toBe(13);

    scope.stop();
  });

  it('does not dispose a pre-built expression', async () => {
    const model = reactive({ x: 1, y: 4 });
    const factory = getExpressionFactory();
    const expr = factory.create<number>(model, 'x + y') as IExpression<number>;

    const scope = effectScope();
    let valueRef: ReturnType<typeof useRsxExpression<number>> | undefined;

    scope.run(() => {
      valueRef = useRsxExpression<number>(expr);
    });

    await nextTick();
    expect(valueRef?.value).toBe(5);

    scope.stop();
    expect(expr.isDisposed).toBe(false);

    model.x = 3;
    await nextTick();
    // valueRef should not update after scope stop
    expect(valueRef?.value).toBe(5);
  });
});
