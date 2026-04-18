import { effectScope } from 'vue';
import { describe, expect, it, vi } from 'vitest';

const { createdExpressions, rsxMock } = vi.hoisted(() => ({
  createdExpressions: [] as Array<{
    dispose: ReturnType<typeof vi.fn>;
    changed: { subscribe: ReturnType<typeof vi.fn> };
    unsubscribe: ReturnType<typeof vi.fn>;
  }>,
  rsxMock: vi.fn(
    (expressionString: string) => (model: Record<string, unknown>) => {
      const unsubscribe = vi.fn();
      const expression = {
        value: model[expressionString],
        dispose: vi.fn(),
        changed: {
          subscribe: vi.fn(() => ({ unsubscribe })),
        },
        unsubscribe,
      };
      createdExpressions.push(expression);
      return expression as unknown;
    },
  ),
}));

vi.mock('@rs-x/expression-parser', () => ({
  rsx: rsxMock,
}));

import { useRsxModel } from '../hooks/use-rsx-model';

describe('useRsxModel disposal (Vue)', () => {
  it('disposes the field expressions it creates when the scope is destroyed', () => {
    createdExpressions.length = 0;
    rsxMock.mockClear();

    const model = {
      price: 100,
      quantity: 2,
    };

    const scope = effectScope();
    let boundModel: typeof model | undefined;

    scope.run(() => {
      boundModel = useRsxModel(model);
    });

    expect(boundModel?.price).toBe(100);
    expect(boundModel?.quantity).toBe(2);

    scope.stop();

    expect(createdExpressions).toHaveLength(2);
    for (const expression of createdExpressions) {
      expect(expression.changed.subscribe).toHaveBeenCalledTimes(1);
      expect(expression.unsubscribe).toHaveBeenCalledTimes(1);
      expect(expression.dispose).toHaveBeenCalledTimes(1);
    }
  });
});
