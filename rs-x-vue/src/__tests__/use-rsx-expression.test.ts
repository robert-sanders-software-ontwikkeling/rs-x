import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { effectScope, nextTick, reactive } from 'vue';

import { InjectionContainer } from '@rs-x/core';
import {
  CompiledExpression,
  ExpressionType,
  type IExpression,
  rsx,
  RsXExpressionParserModule,
} from '@rs-x/expression-parser';

import { useRsxExpression } from '../hooks/use-rsx-expression';

describe('useRsxExpression (Vue)', () => {
  beforeEach(() => {
    InjectionContainer.load(RsXExpressionParserModule);
  });

  afterEach(() => {
    InjectionContainer.unload(RsXExpressionParserModule);
  });
  it('binds an rsx expression and updates when the model changes', async () => {
    const model = reactive({ x: 2, y: 3 });
    const expr = rsx<number>('x + y')(model);
    const scope = effectScope();
    let valueRef: ReturnType<typeof useRsxExpression<number>> | undefined;

    scope.run(() => {
      valueRef = useRsxExpression<number>(expr);
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
    const expr = rsx<number>('x + y')(model) as IExpression<number>;

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

  it('binds a compiled expression', async () => {
    const expr = new CompiledExpression({
      expressionString: 'x + y',
      dependencyNames: [],
      watchDependencies: [],
      expressionType: ExpressionType.Addition,
      hasHiddenArgumentArray: false,
      evaluate: () => 42,
    });
    Object.assign(expr as object, { _value: 42 });

    const scope = effectScope();
    let valueRef: ReturnType<typeof useRsxExpression<number>> | undefined;

    scope.run(() => {
      valueRef = useRsxExpression<number>(expr);
    });

    await nextTick();
    expect(valueRef?.value).toBe(42);

    scope.stop();
    expr.dispose();
  });
});
